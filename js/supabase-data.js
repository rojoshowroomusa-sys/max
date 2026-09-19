/* Carga el catálogo desde Supabase.
   Si no hay cliente, la consulta falla o las tablas están vacías,
   se usa el catálogo estático de products.js como respaldo. */

function mapProduct(row) {
  const meta = row.meta || {};
  return {
    id: row.slug || row.id,
    nombre: row.name,
    categoria: row.categoria || "clasicos",
    desc: row.description || "",
    meta: meta.coccion
      ? { coccion: meta.coccion, punto: meta.punto || "", tiempo: meta.tiempo || "" }
      : undefined,
  };
}

function mapCombo(row) {
  return {
    id: row.slug || row.id,
    icon: row.icon || "🎁",
    nombre: row.name,
    detalle: row.description || "",
  };
}

async function fetchProducts(supabaseClient) {
  const { data, error } = await supabaseClient
    .from("products")
    .select("slug, name, categoria, price_per_kg, description, meta")
    .eq("is_active", true)
    .order("sku", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapProduct);
}

async function fetchCombos(supabaseClient) {
  const { data, error } = await supabaseClient
    .from("combos")
    .select("slug, name, icon, description, price, regular_price")
    .eq("is_active", true)
    .order("price", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapCombo);
}

async function loadCatalog() {
  const client = createSupabaseClient();
  if (!client) return null;

  try {
    const [products, combos] = await Promise.all([
      fetchProducts(client),
      fetchCombos(client),
    ]);
    if (!products.length) return null;
    return { products, combos: combos.length ? combos : COMBOS.slice() };
  } catch (err) {
    console.warn("[supabase] No se pudo cargar el catálogo remoto, usando datos locales:", err);
    return null;
  }
}
