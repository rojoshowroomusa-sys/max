/* Configuración de Supabase.
   La publishable key es pública por diseño (RLS protege los datos).
   Revisar supabase/migrations/20260910001000_connect_frontend_catalog.sql
   para crear las columnas y tablas que consume el frontend. */

const SUPABASE_URL = "https://dezoakblkwhmzskbyugw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_D9QSuoLLEDbUUczUhd7Dqg_3K7tXYwz";

function createSupabaseClient() {
  if (typeof supabase === "undefined") return null;
  return supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}