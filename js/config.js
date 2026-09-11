/* Configuración de Supabase.
   La publishable key es pública por diseño (RLS protege los datos).
   Revisar supabase/migrations/20260910001000_connect_frontend_catalog.sql
   para crear las columnas y tablas que consume el frontend. */

const SUPABASE_URL = "https://dezoakblkwhmzskbyugw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_D9QSuoLLEDbUUczUhd7Dqg_3K7tXYwz";

/* Mercado Pago.
   - MP_PUBLIC_KEY es pública por diseño (va en el frontend).
   - El ACCESS TOKEN de MP es secreto y vive solo en la Supabase Edge Function.
   Reemplazar MP_PUBLIC_KEY y el ref del URL por los reales del proyecto. */
const MP_PUBLIC_KEY = "TU_PUBLIC_KEY_MP"; // TODO: reemplazar por la Public Key de Mercado Pago
const MP_EDGE_FUNCTION_URL =
  "https://dezoakblkwhmzskbyugw.supabase.co/functions/v1/create-mp-preference";

function createSupabaseClient() {
  if (typeof supabase === "undefined") return null;
  return supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}