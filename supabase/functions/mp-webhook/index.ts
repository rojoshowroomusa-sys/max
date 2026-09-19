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
const ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
const WEBHOOK_SECRET = Deno.env.get("MP_WEBHOOK_SECRET"); // opcional
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const ALLOWED_ORIGIN = Deno.env.get("CORS_ALLOWED_ORIGIN") ?? "*";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-signature, x-request-id, data-id",
  };
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
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Valida la firma X-Signature de Mercado Pago (si el secret está configurado).
// X-Signature: ts=<ts>,v1=<hash>  ·  x-request-id: <rid>  ·  id = data.id del body
async function isValidSignature(
  req: Request,
  dataId: string,
  rawBody: string,
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

  const rawBody = await req.text().catch(() => "");

  if (!ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[mp-webhook] Faltan secrets de entorno");
    return new Response("ok", { status: 200 }); // no romper el reintento de MP
  }

  let parsed: { type?: string; data?: { id?: number | string } };
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const dataId = String(parsed?.data?.id ?? "");
  if (!dataId) return new Response("ok", { status: 200 }); // no es una notificación de pago

  if (!(await isValidSignature(req, dataId, rawBody))) {
    console.warn("[mp-webhook] Firma inválida, se ignora la notificación");
    return new Response("ok", { status: 200 });
  }

  // Verifica el estado REAL del pago con la API de MP.
  const mpRes = await fetch(`${MP_API_BASE}/v1/payments/${dataId}`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  if (!mpRes.ok) {
    console.error("[mp-webhook] No se pudo verificar el pago: ", mpRes.status);
    return new Response("ok", { status: 200 }); // dejar que MP reintente
  }
  const payment = await mpRes.json();

  const externalReference = payment.external_reference;
  const status = payment.status; // approved | pending | rejected | cancelled
  const mapOrderStatus =
    status === "approved" ? "paid" : status === "pending" ? "pending" : "failed";

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  let orderId: string | null = null;
  if (externalReference) {
    const { data: orderRow, error: orderLookupError } = await supabase
      .from("orders")
      .select("id")
      .eq("external_reference", externalReference)
      .maybeSingle();
    if (orderLookupError) {
      console.error("[mp-webhook] No se pudo buscar la orden: ", orderLookupError);
    }
    orderId = orderRow?.id ?? null;

    if (orderId) {
      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: mapOrderStatus })
        .eq("id", orderId);
      if (orderError) console.error("[mp-webhook] No se pudo actualizar la orden: ", orderError);
    }
  }

  if (orderId) {
    const { error: payError } = await supabase.from("payments").upsert(
      {
        order_id: orderId,
        mp_payment_id: dataId,
        status,
        status_detail: payment.status_detail || null,
        payment_method: payment.payment_method?.type || null,
        paid_at: status === "approved" ? new Date().toISOString() : null,
      },
      { onConflict: "mp_payment_id" },
    );
    if (payError) console.error("[mp-webhook] No se pudo persistir el payment: ", payError);
  } else {
    console.warn("[mp-webhook] Pago sin orden vinculada, se omite persistencia: ", dataId);
  }

  // Siempre responder 200 para evitar reintentos innecesarios de MP.
  return new Response("ok", { status: 200 });
});