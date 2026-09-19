// Edge Function de Supabase: crea una preferencia de pago de Mercado Pago
// desde el servidor (valida slugs y precios reales en Supabase, nunca confía en
// el precio que envía el cliente). También crea la orden en la tabla `orders`
// con status 'pending' vinculada a la preferencia.
//
// Uso (POST):
//   body: { items: [{ slug: "<slug del corte>", qty_kg: <número en kg> }] }
//   resp: { id: "<preference_id>", init_point: "<url checkout>" }
//
// Entorno:
//   - MP_ACCESS_TOKEN             (secret, Access Token de Mercado Pago)
//   - SUPABASE_SERVICE_ROLE_KEY   (provista por el runtime de Supabase)
//   - SUPABASE_URL                (provista por el runtime de Supabase)
//   - CORS_ALLOWED_ORIGIN         (opcional, dominio del sitio)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MP_API_URL = "https://api.mercadopago.com/checkout/preferences";
const ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Orígenes permitidos para CORS (lista separada por comas). Ajustar al dominio real.
const ALLOWED_ORIGINS = (Deno.env.get("CORS_ALLOWED_ORIGIN") ?? "*")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function corsHeaders(req?: Request) {
  const reqOrigin = req?.headers.get("origin") || "";
  let allow: string;
  if (ALLOWED_ORIGINS.includes("*")) {
    allow = "*";
  } else if (reqOrigin && ALLOWED_ORIGINS.includes(reqOrigin)) {
    allow = reqOrigin;
  } else {
    allow = ALLOWED_ORIGINS[0] || "*";
  }
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

function json(data: unknown, status = 200, req?: Request): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

/**
 * Crea la orden en Supabase con items snapshot y status 'pending'.
 * Retorna el external_reference para vincularla con la preferencia de MP.
 */
async function createOrder(
  supabase: ReturnType<typeof createClient>,
  items: Array<{ slug: string; qtyKg: number; unitPrice: number; name: string }>,
  total: number,
): Promise<string> {
  const externalReference = crypto.randomUUID();
  const totalRounded = Math.round(total * 100) / 100;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      external_reference: externalReference,
      total: totalRounded,
      status: "pending",
      customer_phone: null,
    })
    .select("id")
    .single();

  if (orderError || !order) throw orderError || new Error("No se pudo crear la orden");

  const orderItems = items.map((it) => ({
    order_id: order.id,
    product_slug: it.slug,
    product_name: it.name,
    qty_kg: it.qtyKg,
    unit_price: it.unitPrice,
    subtotal: Math.round(it.unitPrice * it.qtyKg * 100) / 100,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
  if (itemsError) {
    await supabase.from("orders").delete().eq("id", order.id);
    throw itemsError;
  }

  return externalReference;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return json({ error: "Método no permitido" }, 405, req);
  }

  // 1) Validación de entorno
  if (!ACCESS_TOKEN) {
    console.error("Falta MP_ACCESS_TOKEN en el entorno de la Edge Function");
    return json({ error: "Configuración del servidor incompleta (MP_ACCESS_TOKEN)" }, 500, req);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Faltan credenciales de Supabase en el Edge Function");
    return json({ error: "Configuración del servidor incompleta (Supabase)" }, 500, req);
  }

  // 2) Parseo y validación del body
  let body: { items?: Array<{ slug?: unknown; qty_kg?: unknown }> };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body inválido: se esperaba JSON" }, 400, req);
  }

  const items = Array.isArray(body.items) ? body.items : null;
  if (!items || items.length === 0) {
    return json({ error: "El pedido está vacío" }, 400, req);
  }

  // Normaliza y valida cada item (sin confiar en precios del cliente)
  const requested: Array<{ slug: string; qtyKg: number }> = [];
  for (const it of items) {
    const slug = typeof it.slug === "string" ? it.slug.trim() : "";
    const qtyKg = Number(it.qty_kg);
    if (!slug) return json({ error: "Cada item requiere un slug válido" }, 400, req);
    if (!Number.isFinite(qtyKg) || qtyKg <= 0) {
      return json({ error: `Cantidad inválida para ${slug}` }, 400, req);
    }
    requested.push({ slug, qtyKg: Math.round(qtyKg * 100) / 100 });
  }

  // 3) Lee precios reales desde Supabase (server-side)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const slugs = requested.map((r) => r.slug);
  const { data: products, error: dbError } = await supabase
    .from("products")
    .select("slug, name, price_per_kg, is_active")
    .in("slug", slugs);

  if (dbError) {
    console.error("Error de Supabase: ", dbError);
    return json({ error: "Error interno al consultar el catálogo" }, 500, req);
  }

  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const mpItems: Array<{
    id: string;
    title: string;
    quantity: number;
    unit_price: number;
    currency_id: string;
  }> = [];
  const enrichedItems: Array<{ slug: string; qtyKg: number; unitPrice: number; name: string }> = [];

  for (const { slug, qtyKg } of requested) {
    const prod = bySlug.get(slug);
    if (!prod || !prod.is_active) {
      return json({ error: `El corte "${slug}" no está disponible` }, 400, req);
    }
    const unitPrice = Number(prod.price_per_kg);
    mpItems.push({
      id: slug,
      title: prod.name,
      quantity: qtyKg,
      unit_price: unitPrice,
      currency_id: "ARS",
    });
    enrichedItems.push({ slug, qtyKg, unitPrice, name: prod.name });
  }

  // 4) Crear la orden en Supabase con status 'pending'
  const total = mpItems.reduce((sum, it) => sum + it.unit_price * it.quantity, 0);
  let externalReference: string | null = null;

  try {
    externalReference = await createOrder(supabase, enrichedItems, total);
  } catch (orderErr: any) {
    console.error("Error al crear orden en Supabase: ", orderErr);
    return json({ error: "Error interno al crear la orden" }, 500, req);
  }

  // 5) Prepara el body de la preferencia de Mercado Pago.
  // external_reference vincula el pago de MP con nuestra orden en Supabase.
  // La redirección (back_urls) solo aplica al checkout que redirige (wallet brick);
  // el frontend usa cardForm (pago en página), así que back_urls solo se envían
  // cuando el request viene de un dominio público (producción).
  const origin = req.headers.get("origin");
  const isLocalOrigin = !origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(origin);
  const preferenceBody: Record<string, unknown> = {
    items: mpItems,
    external_reference: externalReference,
    // El webhook confirma server-side cuándo un pago pasa a 'paid'.
    notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
  };
  if (!isLocalOrigin) {
    preferenceBody.back_urls = {
      success: `${origin}/#/ok`,
      pending: `${origin}/#/pending`,
      failure: `${origin}/#/error`,
    };
    preferenceBody.auto_return = "approved";
  }

  let mpResp: Response;
  try {
    mpResp = await fetch(MP_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferenceBody),
    });
  } catch (err) {
    console.error("Error de red con Mercado Pago: ", err);
    return json({ error: "No se pudo conectar con la pasarela de pago" }, 502, req);
  }

  const mpData = await mpResp.json().catch(() => null);
  if (!mpResp.ok) {
    console.error("Mercado Pago rechazó la preferencia: ", mpResp.status, mpData);
    // Si MP falla, limpiar la orden creada para no dejar basura
    await supabase.from("orders").delete().eq("external_reference", externalReference);
    return json(
      { error: "Mercado Pago no pudo procesar la preferencia", detail: mpData },
      mpResp.status,
      req,
    );
  }

  // 6) Guarda el preference_id en la orden y devuelve init_point
  const { error: prefError } = await supabase
    .from("orders")
    .update({ mp_preference_id: mpData.id })
    .eq("external_reference", externalReference);
  if (prefError) console.error("No se pudo guardar mp_preference_id: ", prefError);

  const isTest = String(ACCESS_TOKEN).startsWith("TEST-");
  return json({
    id: mpData.id,
    init_point: isTest && mpData.sandbox_init_point ? mpData.sandbox_init_point : mpData.init_point,
  });
});
