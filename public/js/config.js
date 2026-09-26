/* Configuración de Supabase.
   La publishable key es pública por diseño (RLS protege los datos).
   Revisar supabase/migrations/20260910001000_connect_frontend_catalog.sql
   para crear las columnas y tablas que consume el frontend. */

const SUPABASE_URL = "https://jiprthnqojpybfzmwmso.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_cXGazLGNBuwis_Vqxbm43Q_8XQIwd0d";

/* Mercado Pago.
   El checkout usa Checkout Pro alojado: el navegador sólo redirige a la
   Preference creada server-side, así que NO hay ninguna clave de MP en el
   frontend. El MP_ACCESS_TOKEN es secreto y vive sólo en la Edge Function. */
const MP_EDGE_FUNCTION_URL =
  "https://jiprthnqojpybfzmwmso.supabase.co/functions/v1/create-mp-preference";

function createSupabaseClient() {
  if (typeof supabase === "undefined") return null;
  return supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}