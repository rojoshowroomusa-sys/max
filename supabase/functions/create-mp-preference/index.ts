// Edge Function de Supabase: crea una preferencia de pago de Mercado Pago
// desde el servidor. Los precios y la disponibilidad se leen siempre de
// Supabase; el cliente solo envía slugs y cantidades.
//
// Uso (POST):
//   body: {
//     items: [
//       { kind: "corte", slug: "<slug del corte>", qty: <kg> },
//       { kind: "combo", slug: "<slug del combo>", qty: <unidades> }
//     ]
//   }
//   resp: { id: "<preference_id>", checkout_url: "<url checkout>", total: <n> }
//
// Compatibilidad: { slug, qty_kg } sin `kind` se interpreta como corte.
//
// Entorno:
//   - MP_ACCESS_TOKEN             (secret, Access Token de Mercado Pago)
//   - SUPABASE_SERVICE_ROLE_KEY   (provista por el runtime de Supabase)
//   - SUPABASE_URL                (provista por el runtime de Supabase)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MP_API_URL = "https://api.mercadopago.com/v1/checkout/preferences";
const ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Origen permitido para CORS (el dominio del sitio). El deploy exige una URL exacta.
const ALLOWED_ORIGIN = (Deno.env.get("CORS_ALLOWED_ORIGIN") ?? "").replace(/\/+$/, "");

const MAX_BODY_BYTES = 16 * 1024;
const MAX_SLUG_LENGTH = 100;
// Límites por línea. Deben coincidir con MAX_CORTE_KG / MAX_COMBO_UNITS de
// public/js/order.js: el cliente los avisa antes de cobrar y el servidor los
// vuelve a imponer (el cliente nunca es una frontera de confianza).
const MAX_CORTE_KG = 100;
const MAX_COMBO_UNITS = 20;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const rateLimitByIp = new Map<string, { count: number; resetAt: number }>();

type ItemKind = "corte" | "combo";

type RequestedItem = {
  kind: ItemKind;
  slug: string;
  qty: number;
};

type ProductRow = {
  slug: string;
  name: string;
  price_per_kg: number;
  sale_mode: string;
  min_weight_grams: number | null;
  max_weight_grams: number | null;
  stock_grams: number;
  is_active: boolean;
};

type ComboRow = {
  slug: string;
  name: string;
  price: number;
  total_kg: number;
  is_active: boolean;
};

type LineItem = {
  kind: ItemKind;
  slug: string;
  title: string;
  qty: number;
  deliveredKg: number;
  unitPrice: number;
  subtotal: number;
  mpQuantity: number;
  mpUnitPrice: number;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function corsHeaders() {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (ALLOWED_ORIGIN && ALLOWED_ORIGIN !== "*") {
    headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN;
  }
  return headers;
}

function requestOriginAllowed(req: Request): boolean {
  if (!ALLOWED_ORIGIN) return false;
  return ALLOWED_ORIGIN === "*" || req.headers.get("origin") === ALLOWED_ORIGIN;
}

function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function rateLimitRetryAfter(ip: string): number {
  const now = Date.now();
  for (const [key, entry] of rateLimitByIp) {
    if (entry.resetAt <= now) rateLimitByIp.delete(key);
  }
  const current = rateLimitByIp.get(ip);
  if (!current || current.resetAt <= now) {
    rateLimitByIp.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return 0;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_MAX_REQUESTS
    ? Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    : 0;
}

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), ...extraHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  // 1) Método, origen y configuración
  if (req.method === "OPTIONS") {
    if (!requestOriginAllowed(req)) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders() });
    }
    return new Response("ok", { headers: corsHeaders() });
  }
  if (req.method !== "POST") {
    return json({ error: "Método no permitido" }, 405);
  }
  if (!ALLOWED_ORIGIN) {
    console.error("Falta CORS_ALLOWED_ORIGIN en el entorno de la Edge Function");
    return json({ error: "Configuración del servidor incompleta (CORS)" }, 500);
  }
  if (!requestOriginAllowed(req)) {
    return json({ error: "Origen no permitido" }, 403);
  }
  if (!ACCESS_TOKEN) {
    console.error("Falta MP_ACCESS_TOKEN en el entorno de la Edge Function");
    return json({ error: "Configuración del servidor incompleta (MP_ACCESS_TOKEN)" }, 500);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Faltan credenciales de Supabase en el entorno de la Edge Function");
    return json({ error: "Configuración del servidor incompleta (Supabase)" }, 500);
  }

  const contentType = (req.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    return json({ error: "Se requiere Content-Type: application/json" }, 415);
  }

  const retryAfter = rateLimitRetryAfter(clientIp(req));
  if (retryAfter > 0) {
    return json({ error: "Demasiadas consultas. Probá de nuevo en unos minutos." }, 429, {
      "Retry-After": String(retryAfter),
    });
  }

  // 2) Parseo y validación del body
  const contentLength = Number(req.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ error: "El pedido es demasiado grande" }, 413);
  }
  const rawBody = await req.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return json({ error: "El pedido es demasiado grande" }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "Body inválido: se esperaba JSON" }, 400);
  }

  const rawItems = body && typeof body === "object"
    ? (body as { items?: unknown }).items
    : null;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return json({ error: "El pedido está vacío" }, 400);
  }
  if (rawItems.length > 50) {
    return json({ error: "El pedido tiene demasiadas líneas" }, 400);
  }

  // Normaliza, limita y agrega slugs duplicados. Nunca acepta precios.
  const requestedByKey = new Map<string, RequestedItem>();
  for (const candidate of rawItems) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return json({ error: "Formato de item inválido" }, 400);
    }
    const item = candidate as Record<string, unknown>;
    const allowedKeys = new Set(["kind", "slug", "qty", "qty_kg"]);
    if (Object.keys(item).some((key) => !allowedKeys.has(key))) {
      return json({ error: "El item contiene campos no permitidos" }, 400);
    }
    if (item.qty !== undefined && item.qty_kg !== undefined) {
      return json({ error: "Cada item puede enviar qty o qty_kg, no ambos" }, 400);
    }
    const kindValue = item.kind;
    const kind: ItemKind = kindValue === undefined ? "corte" : kindValue as ItemKind;
    const slug = typeof item.slug === "string" ? item.slug.trim() : "";
    const rawQty = item.qty ?? item.qty_kg;

    if (kind !== "corte" && kind !== "combo") {
      return json({ error: `Tipo de item inválido para ${slug || "el pedido"}` }, 400);
    }
    if (!slug || slug.length > MAX_SLUG_LENGTH || !/^[a-z0-9][a-z0-9-]*$/i.test(slug)) {
      return json({ error: "Cada item requiere un slug válido" }, 400);
    }
    if (typeof rawQty !== "number" || !Number.isFinite(rawQty) || rawQty <= 0) {
      return json({ error: `Cantidad inválida para ${slug}` }, 400);
    }
    const qty = rawQty;
    if (kind === "combo" && !Number.isInteger(qty)) {
      return json({ error: `Los combos se venden por unidades enteras: ${slug}` }, 400);
    }

    const normalizedQty = kind === "combo" ? qty : round2(qty);
    const maxQty = kind === "combo" ? MAX_COMBO_UNITS : MAX_CORTE_KG;
    if (!(normalizedQty > 0)) {
      return json({ error: `Cantidad inválida para ${slug}` }, 400);
    }
    if (normalizedQty > maxQty) {
      return json({ error: `Cantidad máxima excedida para ${slug}` }, 400);
    }

    const key = `${kind}:${slug}`;
    const existing = requestedByKey.get(key);
    const combinedQty = round2((existing?.qty || 0) + normalizedQty);
    if (combinedQty > maxQty) {
      return json({ error: `Cantidad máxima excedida para ${slug}` }, 400);
    }
    requestedByKey.set(key, { kind, slug, qty: combinedQty });
  }
  const requested = [...requestedByKey.values()];

  // 3) Lee precios y disponibilidad reales desde Supabase (server-side).
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const corteSlugs = requested.filter((item) => item.kind === "corte").map((item) => item.slug);
  const comboSlugs = requested.filter((item) => item.kind === "combo").map((item) => item.slug);
  const products: ProductRow[] = [];
  const combos: ComboRow[] = [];

  if (corteSlugs.length > 0) {
    const { data, error } = await supabase
      .from("products")
      .select("slug, name, price_per_kg, sale_mode, min_weight_grams, max_weight_grams, stock_grams, is_active")
      .in("slug", corteSlugs);
    if (error) {
      console.error("Error de Supabase al leer productos: ", error);
      return json({ error: "Error interno al consultar el catálogo" }, 500);
    }
    products.push(...((data || []) as ProductRow[]));
  }

  if (comboSlugs.length > 0) {
    const { data, error } = await supabase
      .from("combos")
      .select("slug, name, price, total_kg, is_active")
      .in("slug", comboSlugs);
    if (error) {
      console.error("Error de Supabase al leer combos: ", error);
      return json({ error: "Error interno al consultar los combos" }, 500);
    }
    combos.push(...((data || []) as ComboRow[]));
  }

  const productsBySlug = new Map(products.map((product) => [product.slug, product]));
  const combosBySlug = new Map(combos.map((combo) => [combo.slug, combo]));
  const lines: LineItem[] = [];

  for (const item of requested) {
    if (item.kind === "corte") {
      const product = productsBySlug.get(item.slug);
      const unitPrice = Number(product?.price_per_kg);
      if (!product || !product.is_active) {
        return json({ error: `El corte "${item.slug}" no está disponible` }, 400);
      }
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        return json({ error: `El corte "${item.slug}" no tiene un precio válido` }, 400);
      }
      if (product.sale_mode !== "variable_weight" && product.sale_mode !== "estimated_weight") {
        return json({ error: `El corte "${item.slug}" no se vende por kg` }, 400);
      }

      const requestedGrams = Math.round(item.qty * 1000);
      const minGrams = Number(product.min_weight_grams);
      const maxGrams = Number(product.max_weight_grams);
      if (
        !Number.isInteger(requestedGrams) ||
        requestedGrams <= 0 ||
        !Number.isFinite(minGrams) ||
        !Number.isFinite(maxGrams) ||
        minGrams <= 0 ||
        maxGrams < minGrams
      ) {
        return json({ error: `El corte "${item.slug}" no tiene un rango de peso válido` }, 400);
      }
      if (requestedGrams < minGrams || requestedGrams > maxGrams) {
        return json(
          { error: `El corte "${item.slug}" permite entre ${minGrams / 1000} y ${maxGrams / 1000} kg` },
          400,
        );
      }

      // Esta comprobación es un snapshot de disponibilidad, no una reserva:
      // la reserva/descuento de stock debe estar definido por el flujo
      // operativo (o por una futura reserva transaccional) para no prometer
      // que una Preference por sí sola bloquea inventario.
      const stockGrams = Number(product.stock_grams);
      if (!Number.isFinite(stockGrams) || stockGrams < requestedGrams) {
        return json({ error: `El corte "${item.slug}" no tiene stock suficiente` }, 400);
      }

      const subtotal = round2(unitPrice * item.qty);
      // Mercado Pago requiere cantidades enteras. Si llega kg fraccionario,
      // se factura como una unidad con el subtotal exacto de la línea.
      const mpQuantity = Number.isInteger(item.qty) ? item.qty : 1;
      const mpUnitPrice = mpQuantity === 1 ? subtotal : round2(unitPrice);
      lines.push({
        kind: "corte",
        slug: item.slug,
        title: product.name,
        qty: item.qty,
        deliveredKg: item.qty,
        unitPrice: round2(unitPrice),
        subtotal,
        mpQuantity,
        mpUnitPrice,
      });
      continue;
    }

    const combo = combosBySlug.get(item.slug);
    const unitPrice = Number(combo?.price);
    const kgPerCombo = Number(combo?.total_kg);
    if (!combo || !combo.is_active) {
      return json({ error: `El combo "${item.slug}" no está disponible` }, 400);
    }
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return json({ error: `El combo "${item.slug}" no tiene un precio válido` }, 400);
    }
    if (!Number.isFinite(kgPerCombo) || kgPerCombo <= 0) {
      return json({ error: `El combo "${item.slug}" no declara sus kilos` }, 400);
    }

    lines.push({
      kind: "combo",
      slug: item.slug,
      title: combo.name,
      qty: item.qty,
      deliveredKg: round2(kgPerCombo * item.qty),
      unitPrice: round2(unitPrice),
      subtotal: round2(unitPrice * item.qty),
      mpQuantity: item.qty,
      mpUnitPrice: round2(unitPrice),
    });
  }

  const mpItems = lines.map((line) => ({
    id: `${line.kind}:${line.slug}`,
    title: line.title,
    quantity: line.mpQuantity,
    unit_price: line.mpUnitPrice,
    currency_id: "ARS",
  }));
  const total = round2(lines.reduce((sum, line) => sum + line.subtotal, 0));
  if (!Number.isFinite(total) || total <= 0) {
    return json({ error: "El pedido no tiene un total válido" }, 400);
  }

  // 4) Prepara la preferencia. external_reference vincula el pago de MP
  //    con nuestra orden en Supabase.
  const externalReference = crypto.randomUUID();
  const origin = ALLOWED_ORIGIN.replace(/\/+$/, "");
  const preferenceBody = {
    items: mpItems,
    external_reference: externalReference,
    back_urls: {
      success: `${origin}/#/ok`,
      pending: `${origin}/#/pending`,
      failure: `${origin}/#/error`,
    },
    auto_return: "approved",
    // El webhook confirma server-side cuándo un pago pasa a 'paid'.
    notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
  };

  // 5) Persiste primero la orden y su snapshot. Así una notificación que
  //    llegue inmediatamente después de crear la Preference nunca puede quedar
  //    sin una orden local asociada.
  const { error: orderError } = await supabase.from("orders").insert({
    id: externalReference,
    mp_preference_id: null,
    external_reference: externalReference,
    total,
    status: "pending",
  });
  if (orderError) {
    console.error("No se pudo registrar la orden: ", orderError);
    return json({ error: "No se pudo registrar la orden" }, 500);
  }

  const { error: itemsError } = await supabase.from("order_items").insert(
    lines.map((line) => ({
      order_id: externalReference,
      product_slug: line.slug,
      product_name: line.title,
      kind: line.kind,
      qty_kg: line.deliveredKg,
      qty_units: line.kind === "combo" ? line.qty : null,
      unit_price: line.unitPrice,
      subtotal: line.subtotal,
    })),
  );
  if (itemsError) {
    console.error("No se pudieron registrar los ítems: ", itemsError);
    await supabase.from("orders").update({ status: "failed" }).eq("id", externalReference);
    return json({ error: "No se pudieron registrar los ítems de la orden" }, 500);
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
    await supabase.from("orders").update({ status: "failed" }).eq("id", externalReference);
    return json({ error: "No se pudo conectar con la pasarela de pago" }, 502);
  }

  const mpData = await mpResp.json().catch(() => null);
  if (!mpResp.ok) {
    console.error("Mercado Pago rechazó la preferencia. Estado:", mpResp.status);
    await supabase.from("orders").update({ status: "failed" }).eq("id", externalReference);
    return json({ error: "Mercado Pago no pudo procesar la preferencia" }, 502);
  }
  if (!mpData || typeof mpData !== "object" || !mpData.id) {
    console.error("Mercado Pago devolvió una respuesta de Preference incompleta");
    await supabase.from("orders").update({ status: "failed" }).eq("id", externalReference);
    return json({ error: "La pasarela de pago devolvió una respuesta inválida" }, 502);
  }

  const isSandbox = ACCESS_TOKEN.startsWith("TEST-");
  const checkoutUrl = isSandbox
    ? mpData.sandbox_init_point || mpData.init_point
    : mpData.init_point;
  if (!checkoutUrl || typeof checkoutUrl !== "string") {
    console.error("Mercado Pago no devolvió una URL de checkout");
    await supabase.from("orders").update({ status: "failed" }).eq("id", externalReference);
    return json({ error: "La pasarela de pago no devolvió una URL de checkout" }, 502);
  }

  // 6) Vincula la Preference creada. Si este update falla, la referencia
  //    externa sigue permitiendo que el webhook encuentre la orden y no se
  //    duplica el cobro ni se expulsa al comprador del flujo.
  const { error: linkError } = await supabase
    .from("orders")
    .update({ mp_preference_id: mpData.id })
    .eq("id", externalReference);
  if (linkError) {
    console.error("No se pudo vincular la Preference con la orden: ", linkError);
  }

  // 7) Devuelve el preference id, la URL de Checkout Pro y el total server-side.
  return json({
    id: mpData.id,
    init_point: mpData.init_point,
    sandbox_init_point: mpData.sandbox_init_point,
    checkout_url: checkoutUrl,
    total,
  });
});
