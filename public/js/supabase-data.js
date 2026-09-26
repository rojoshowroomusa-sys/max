/* Carga el catálogo desde Supabase.
   Si no hay cliente, la consulta falla o las tablas están vacías,
   se usa el catálogo estático de products.js como respaldo. */

function mapProduct(row) {
  const meta = row.meta || {};
  // Las fotos verificadas viven en la ficha local (products.js): cada imagen
  // fue chequeada contra el corte real. El remoto sólo debe poder pisarlas con
  // una imagen propia (p. ej. cuando el admin cargue fotos). Mientras la
  // migración de imágenes no esté aplicada, el remoto devuelve image_url vacío
  // y se conserva la foto local correcta en lugar de perderla.
  const local = CORTES.find((corte) => corte.id === (row.slug || row.id));
  return {
    id: row.slug || row.id,
    nombre: row.name,
    categoria: row.categoria || "clasico",
    price: Number(row.price_per_kg),
    // Rango de venta y stock en gramos (server-side en create-mp-preference).
    // Sin ellos el stepper deja armar pedidos que el servidor rechaza.
    minG: Number(row.min_weight_grams),
    maxG: Number(row.max_weight_grams),
    stockG: Number(row.stock_grams),
    desc: row.description || "",
    meta: meta.coccion
      ? { coccion: meta.coccion, punto: meta.punto || "", tiempo: meta.tiempo || "" }
      : undefined,
    img: row.image_url || (local && local.img) || undefined,
  };
}

function mapCombo(row) {
  const localKg = Number(
    (COMBOS.find((combo) => combo.id === (row.slug || row.id)) || {}).kg || 0,
  );
  return {
    id: row.slug || row.id,
    icon: row.icon || "🎁",
    nombre: row.name,
    detalle: row.description || "",
    price: Number(row.price),
    regularPrice: Number(row.regular_price || row.price),
    // Los kilos vienen del servidor (total_kg). Sólo si la columna todavía no
    // existe se usa la ficha local conocida para no mostrar 0 kg.
    kg: row.total_kg != null ? Number(row.total_kg) : localKg,
  };
}

async function fetchProducts(supabaseClient) {
  const { data, error } = await supabaseClient
    .from("products")
    .select("slug, name, categoria, price_per_kg, min_weight_grams, max_weight_grams, stock_grams, description, meta, image_url")
    .eq("is_active", true)
    .order("sku", { ascending: true });
  if (error) throw error;
  // Cortes retirados del catálogo a propósito: se filtran aunque el remoto
  // todavía los devuelva activos (hasta que la migración 20260925030000 los
  // marque is_active=false en el deploy).
  const RETIRED = new Set(["bifes", "bife-lomo-media-res", "completo", "mocho", "asado", "ojo-bife"]);
  return (data || [])
    .filter((row) => !RETIRED.has(row.slug || row.id))
    .map(mapProduct);
}

const COMBO_COLUMNS = "slug, name, icon, description, price, regular_price, total_kg";
const COMBO_COLUMNS_LEGACY = "slug, name, icon, description, price, regular_price";

async function fetchCombos(supabaseClient) {
  let result = await supabaseClient
    .from("combos")
    .select(COMBO_COLUMNS)
    .eq("is_active", true)
    .order("price", { ascending: true });

  // La columna total_kg llega con la migración de combos comprables. Si todavía
  // no existe, se reintenta sin ella para no perder el resto del catálogo.
  if (result.error) {
    const legacy = await supabaseClient
      .from("combos")
      .select(COMBO_COLUMNS_LEGACY)
      .eq("is_active", true)
      .order("price", { ascending: true });
    if (legacy.error) throw legacy.error;
    console.warn(
      "[supabase] combos.total_kg no disponible todavía; se usan los kilos de la ficha local.",
    );
    return (legacy.data || []).map(mapCombo);
  }

  return (result.data || []).map(mapCombo);
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
    // Puente de sincronización: cortes del catálogo oficial que la migración
    // de siembra todavía no aplicó en remoto (falta hacer db push). Se anexan
    // desde la ficha local para que ya se puedan vender. Una vez que el remoto
    // los devuelve (migración aplicada), este merge se vuelve no-op. NO se usa
    // para resucitar productos desactivados a propósito: si un corte está en
    // la lista pero se desactiva en Supabase, hay que sacarlo de acá.
    // TODO: sujeto a cambio cuando exista el panel admin (fase siguiente).
    const PENDING_LOCAL_CUTS = ["falda", "ojo-de-bife", "tapa-nalga", "aguja", "bife-ancho", "bife-angosto", "tira-asado", "tortuguita", "palomita"];
    const remoteIds = new Set(products.map((p) => p.id));
    const pending = PENDING_LOCAL_CUTS.map((id) => CORTES.find((c) => c.id === id))
      .filter((corte) => corte && !remoteIds.has(corte.id));
    return { products: [...products, ...pending], combos };
  } catch (err) {
    console.warn("[supabase] No se pudo cargar el catálogo remoto, usando datos locales:", err);
    return null;
  }
}