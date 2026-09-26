// Edge Function de Supabase: webhook de Mercado Pago.
// Confirma server-side cuando un pago real queda aprobado y marca la orden
// correspondiente como 'paid'.
//
// IMPORTANTE: nunca se confía en el body del webhook para marcar un pago como
// pagado (se puede falsear). Siempre se verifica el estado real del pago
// contra la API de Mercado Pago (GET /v1/payments/{id}) y, si el secret
// MP_WEBHOOK_SECRET está configurado, se valida la firma X-Signature.
//
// Entorno:
//   - MP_ACCESS_TOKEN       (secret, Access Token de Mercado Pago)
//   - MP_WEBHOOK_SECRET     (secret, opcional: firma de webhook de MP)
//   - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (provistos por el runtime)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MP_API_BASE = "https://api.mercadopago.com";
const MAX_BODY_BYTES = 64 * 1024;
const ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
const WEBHOOK_SECRET = Deno.env.get("MP_WEBHOOK_SECRET"); // opcional
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const ALLOWED_ORIGIN = (Deno.env.get("CORS_ALLOWED_ORIGIN") ?? "").replace(/\/+$/, "");

function corsHeaders() {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-signature, x-request-id, data-id",
  };
  if (ALLOWED_ORIGIN) headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN;
  return headers;
}

const enc = new TextEncoder();
async function sha256Hex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Comparación en tiempo constante (no cortocircuita por longitud).
function constantTimeEqual(a: string, b: string): boolean {
  const maxLength = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < maxLength; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

// Valida la firma X-Signature de Mercado Pago (si el secret está configurado).
// X-Signature: ts=<ts>,v1=<hash>  ·  x-request-id: <rid>  ·  id = data.id del query
async function isValidSignature(
  req: Request,
  dataId: string,
): Promise<boolean> {
  if (!WEBHOOK_SECRET) return true; // sin secret: confiar en la verificación vía API
  const sigHeader = req.headers.get("x-signature") || "";
  const params = new URLSearchParams(sigHeader.replace(/,/g, "&"));
  const ts = params.get("ts") ?? "";
  const v1 = params.get("v1") ?? "";
  const requestId = req.headers.get("x-request-id") || "";
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hash = await sha256Hex(WEBHOOK_SECRET, manifest);
  return constantTimeEqual(hash, v1);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders() });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const contentLength = Number(req.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return new Response("Payload too large", { status: 413 });
  }
  const rawBody = await req.text().catch(() => "");
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return new Response("Payload too large", { status: 413 });
  }

  if (!ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[mp-webhook] Faltan secrets de entorno");
    return new Response("Configuration error", { status: 500 });
  }

  let parsed: { type?: string; action?: string; data?: { id?: number | string } };
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (parsed.type && parsed.type !== "payment") {
    return new Response("ok", { status: 200 });
  }

  // Mercado Pago envía el ID del pago en data.id del query string. El body
  // se acepta como compatibilidad, pero nunca se permite que ambos discrepen.
  const queryDataId = new URL(req.url).searchParams.get("data.id") || "";
  const bodyDataId = parsed?.data?.id == null ? "" : String(parsed.data.id);
  if (queryDataId && bodyDataId && queryDataId !== bodyDataId) {
    return new Response("Invalid payment id", { status: 400 });
  }
  const dataId = queryDataId || bodyDataId;
  if (!/^\d+$/.test(dataId)) {
    return new Response("ok", { status: 200 }); // no es una notificación de pago
  }

  if (!(await isValidSignature(req, dataId))) {
    console.warn("[mp-webhook] Firma inválida, se rechaza la notificación");
    return new Response("Invalid signature", { status: 401 });
  }

  // Verifica el estado REAL del pago con la API de MP.
  const mpRes = await fetch(`${MP_API_BASE}/v1/payments/${dataId}`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    cache: "no-store",
  });
  if (!mpRes.ok) {
    console.error("[mp-webhook] No se pudo verificar el pago: ", mpRes.status);
    return new Response("MP verification failed", { status: 502 });
  }
  const payment = await mpRes.json().catch(() => null);
  if (!payment || typeof payment !== "object" || Array.isArray(payment)) {
    console.error("[mp-webhook] Mercado Pago devolvió un pago inválido");
    return new Response("Invalid payment response", { status: 502 });
  }

  const externalReference = typeof payment.external_reference === "string"
    ? payment.external_reference
    : "";
  // Estados reales de Mercado Pago. in_process/authorized todavía no
  // acreditaron: la orden queda 'pending'. charged_back es un contracargo
  // económico real, por eso se trata como 'refunded' y no como 'failed'.
  const status = payment.status; // approved | pending | in_process | authorized
  //   | rejected | cancelled | refunded | charged_back
  if (!externalReference) {
    console.warn("[mp-webhook] El pago no tiene external_reference; se ignora");
    return new Response("ok", { status: 200 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Busca la orden antes de tocar pagos o estados: no se acepta una referencia
  // externa ajena a este comercio.
  const { data: order, error: orderLookupError } = await supabase
    .from("orders")
    .select("id, total, status, paid_at, mp_preference_id")
    .eq("external_reference", externalReference)
    .maybeSingle();
  if (orderLookupError) {
    console.error("[mp-webhook] No se pudo consultar la orden: ", orderLookupError);
    return new Response("DB error", { status: 500 });
  }
  if (!order) {
    // Puede ser una notificación que llegó justo después de crear la
    // Preference, antes de que el checkout haya terminado de persistir la
    // orden. Un 5xx permite que Mercado Pago reintente.
    console.warn("[mp-webhook] external_reference sin orden local; se reintentará");
    return new Response("Order not found", { status: 500 });
  }

  const { count: itemCount, error: itemCountError } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("order_id", order.id);
  if (itemCountError) {
    console.error("[mp-webhook] No se pudo verificar el snapshot de la orden: ", itemCountError);
    return new Response("DB error", { status: 500 });
  }
  if (!itemCount) {
    console.error("[mp-webhook] La orden no tiene ítems; se reintentará");
    return new Response("Order items not found", { status: 500 });
  }

  const expectedAmount = Number(order.total);
  const paidAmount = Number(payment.transaction_amount ?? payment.transaction_details?.total_paid_amount);
  const currencyMatches = payment.currency_id === "ARS";
  const preferenceMatches =
    !order.mp_preference_id || payment.preference_id === order.mp_preference_id;
  const sandboxToken = ACCESS_TOKEN.startsWith("TEST-");
  const modeMatches =
    typeof payment.live_mode !== "boolean" || payment.live_mode === !sandboxToken;
  const amountMatches =
    Number.isFinite(expectedAmount) &&
    Number.isFinite(paidAmount) &&
    Math.abs(expectedAmount - paidAmount) < 0.01 &&
    currencyMatches &&
    preferenceMatches &&
    modeMatches;
  const approvedPaymentMatches = status === "approved" && amountMatches;

  if (status === "approved" && !amountMatches) {
    console.error("[mp-webhook] Pago aprobado no coincide con la orden (monto, moneda, Preference o ambiente)");
  }
  // Matriz de transición explícita. 'in_process' y 'authorized' siguen sin
  // acreditarse, así que no pueden marcar la orden como 'failed'.
  const mapOrderStatus =
    status === "approved"
      ? approvedPaymentMatches ? "paid" : "failed"
      : status === "pending" || status === "in_process" || status === "authorized"
      ? "pending"
      : status === "refunded" || status === "charged_back"
      ? "refunded"
      : "failed";

  // No permitimos que un evento viejo degrade una orden ya terminada. Un
  // refund sí puede pasar de paid a refunded; un approved viejo no revive un
  // refund.
  const preserveTerminalState =
    (order.status === "paid" && !["paid", "refunded"].includes(mapOrderStatus)) ||
    (order.status === "refunded" && mapOrderStatus !== "refunded");
  const paymentPaidAt = approvedPaymentMatches
    ? order.paid_at || new Date().toISOString()
    : preserveTerminalState
    ? undefined
    : null;

  // Persiste el payment (idempotente por mp_payment_id).
  const { error: payError } = await supabase.from("payments").upsert(
    {
      order_id: order.id,
      mp_payment_id: dataId,
      status,
      status_detail: status === "approved" && !amountMatches
        ? "payment_invariant_mismatch"
        : payment.status_detail || null,
      payment_method: payment.payment_method?.type || null,
      amount: Number.isFinite(paidAmount) ? paidAmount : null,
      currency_id: payment.currency_id || null,
      preference_id: payment.preference_id || null,
      paid_at: paymentPaidAt,
    },
    { onConflict: "mp_payment_id" },
  );
  if (payError) {
    console.error("[mp-webhook] No se pudo persistir el payment: ", payError);
    return new Response("DB error", { status: 500 });
  }

  if (!preserveTerminalState) {
    // La condición se aplica en la propia actualización para que dos eventos
    // simultáneos no puedan degradar paid/refunded por usar una lectura vieja.
    const paidAt = order.paid_at ||
      (mapOrderStatus === "paid" ? new Date().toISOString() : null);
    let orderUpdate = supabase
      .from("orders")
      .update({ status: mapOrderStatus, paid_at: paidAt })
      .eq("id", order.id);

    if (mapOrderStatus === "pending" || mapOrderStatus === "failed") {
      orderUpdate = orderUpdate.eq("status", "pending");
    } else if (mapOrderStatus === "paid") {
      // Una orden paid ya terminal no necesita otra escritura; refunded nunca
      // se revive desde un evento approved.
      orderUpdate = orderUpdate.in("status", ["pending", "failed"]);
    } else if (mapOrderStatus === "refunded") {
      orderUpdate = orderUpdate.in("status", ["pending", "paid", "failed", "refunded"]);
    }

    const { error: orderError } = await orderUpdate;
    if (orderError) {
      console.error("[mp-webhook] No se pudo actualizar la orden: ", orderError);
      return new Response("DB error", { status: 500 });
    }
  }

  return new Response("ok", { status: 200 });
});