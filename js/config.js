/* Configuración de Supabase.
   La publishable key es pública por diseño (RLS protege los datos). */

const SUPABASE_URL = "https://jiprthnqojpybfzmwmso.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_cXGazLGNBuwis_Vqxbm43Q_8XQIwd0d";

/* Mercado Pago.
   - MP_PUBLIC_KEY es pública por diseño (va en el frontend).
   - El ACCESS TOKEN de MP es secreto y vive solo en la Supabase Edge Function. */
const MP_PUBLIC_KEY = "TEST-30e3b2d7-9065-456f-9b83-04a7b1fe9e60";
const MP_EDGE_FUNCTION_URL =
  "https://jiprthnqojpybfzmwmso.supabase.co/functions/v1/create-mp-preference";

function createSupabaseClient() {
  if (typeof supabase === "undefined") return null;
  return supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}
