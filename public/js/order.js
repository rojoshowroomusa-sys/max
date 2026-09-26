const ORDER_KEY = "max_pedido_v2";
const LEGACY_ORDER_KEY = "max_pedido_v1";

/* Límites por línea. Deben coincidir con MAX_CORTE_KG / MAX_COMBO_UNITS /
   MAX_ACCESORIO_UNITS de supabase/functions/create-mp-preference/index.ts.
   Acá sólo se avisa; la validación real siempre es server-side. */
const MAX_CORTE_KG = 100;
const MAX_COMBO_UNITS = 20;
const MAX_ACCESORIO_UNITS = 20;

/* Tres mapas porque los cortes se venden por kg y los combos y los accesorios
   por unidad con precio cerrado. Se guardan juntos bajo una sola clave. */
let pedido = {}; // slug -> kg        (cortes sueltos)
let comboPedido = {}; // slug -> unidades (combos armados)
let accesorioPedido = {}; // slug -> unidades (accesorios)

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function clampCorteKg(value) {
  return Math.min(MAX_CORTE_KG, round2(value));
}

/* Unidades de combos y accesorios: siempre enteras, con tope por línea. */
function clampUnits(value, max) {
  return Math.min(max, Math.max(0, Math.round(Number(value) || 0)));
}

/* ---------- Reglas de venta (espejo server-side) ----------
   create-mp-preference valida min/max/stock en gramos y RECHAZA el pedido si
   se pasa. El stepper usa estos mismos límites para que nunca se pueda armar
   un carrito que el servidor va a devolver con error. */

const CORTE_STEP_KG = 0.5;

function corteMinKg(corte) {
  const min = Number(corte && corte.minG);
  if (Number.isFinite(min) && min > 0) return round2(min / 1000);
  return CORTE_STEP_KG;
}

function corteMaxKg(corte) {
  const limits = [MAX_CORTE_KG];
  const max = Number(corte && corte.maxG);
  const stock = Number(corte && corte.stockG);
  if (Number.isFinite(max) && max > 0) limits.push(round2(max / 1000));
  if (Number.isFinite(stock) && stock > 0) limits.push(round2(stock / 1000));
  return round2(Math.min(...limits));
}

/* Ajusta un kilaje al rango vendible del corte. Devuelve 0 si el valor
   resultaría en sacar el ítem del carrito. */
function clampCorteFor(id, value) {
  const qty = round2(value);
  if (!(qty > 0)) return 0;
  const min = corteMinKg(findCorte(id));
  const max = corteMaxKg(findCorte(id));
  return Math.min(max, Math.max(min, qty));
}

/* ---------- Dinero y formatos ---------- */

function kgFmt(value) {
  return `${Number(value).toLocaleString("es-AR")} kg`;
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

/* Descarta valores corruptos o negativos que could've quedado guardados.
   `max` es el tope de la línea y `integerValues` si las unidades son enteras. */
function sanitizeCartMap(raw, max, integerValues = false) {
  if (!isObject(raw)) return {};
  const clean = {};
  for (const [id, rawQty] of Object.entries(raw)) {
    const qty = Number(rawQty);
    if (!id || !Number.isFinite(qty) || qty <= 0) continue;
    const normalized = integerValues ? Math.round(qty) : round2(qty);
    if (!(normalized > 0)) continue;
    clean[id] = Math.min(max, normalized);
  }
  return clean;
}

/* Migra carritos guardados con el formato viejo (plano = cortes). */
function loadPedido() {
  try {
    const stored = localStorage.getItem(ORDER_KEY);
    const raw = stored ? JSON.parse(stored) : null;

    // Un carrito guardado antes de los accesorios no tiene la clave `accesorios`:
    // se carga como {} sin romper nada.
    if (
      isObject(raw) &&
      (isObject(raw.cortes) || isObject(raw.combos) || isObject(raw.accesorios))
    ) {
      pedido = sanitizeCartMap(raw.cortes, MAX_CORTE_KG);
      comboPedido = sanitizeCartMap(raw.combos, MAX_COMBO_UNITS, true);
      accesorioPedido = sanitizeCartMap(raw.accesorios, MAX_ACCESORIO_UNITS, true);
      return;
    }

    const legacy = JSON.parse(localStorage.getItem(LEGACY_ORDER_KEY) || "null");
    pedido = sanitizeCartMap(legacy, MAX_CORTE_KG);
    comboPedido = {};
    accesorioPedido = {};
    if (Object.keys(pedido).length) savePedido();
  } catch {
    pedido = {};
    comboPedido = {};
    accesorioPedido = {};
  }
}

function savePedido() {
  try {
    localStorage.setItem(
      ORDER_KEY,
      JSON.stringify({ cortes: pedido, combos: comboPedido, accesorios: accesorioPedido }),
    );
  } catch (err) {
    console.warn("[carrito] No se pudo guardar el pedido:", err);
  }
}

/* Toda mutación del carrito pasa por acá: se guarda y se avisa al flujo de
   checkout para que un cambio de pedido libere un pago en curso. */
function persistPedido() {
  savePedido();
  if (typeof onPedidoChanged === "function") onPedidoChanged();
}

/* Quita del carrito lo que ya no existe o está inactivo en el catálogo, y
   recorta las cantidades a los límites permitidos. Sin esto, un producto
   desactivado quedaba en el carrito y el checkout entero era rechazado por el
   servidor. Devuelve la cantidad de líneas quitadas para poder avisar. */
function reconcilePedidoWithCatalog() {
  const activeCortes = new Set(CORTES.map((corte) => corte.id));
  const activeCombos = new Set(COMBOS.map((combo) => combo.id));
  const activeAccesorios = new Set(ACCESORIOS.map((accesorio) => accesorio.id));
  let removed = 0;

  for (const slug of Object.keys(pedido)) {
    if (!activeCortes.has(slug)) {
      delete pedido[slug];
      removed += 1;
      continue;
    }
    const qty = clampCorteFor(slug, pedido[slug]);
    if (!(qty > 0)) {
      delete pedido[slug];
      removed += 1;
    } else {
      pedido[slug] = qty;
    }
  }

  for (const slug of Object.keys(comboPedido)) {
    if (!activeCombos.has(slug)) {
      delete comboPedido[slug];
      removed += 1;
      continue;
    }
    const units = clampUnits(comboPedido[slug], MAX_COMBO_UNITS);
    if (!(units > 0)) {
      delete comboPedido[slug];
      removed += 1;
    } else {
      comboPedido[slug] = units;
    }
  }

  for (const slug of Object.keys(accesorioPedido)) {
    if (!activeAccesorios.has(slug)) {
      delete accesorioPedido[slug];
      removed += 1;
      continue;
    }
    const units = clampUnits(accesorioPedido[slug], MAX_ACCESORIO_UNITS);
    if (!(units > 0)) {
      delete accesorioPedido[slug];
      removed += 1;
    } else {
      accesorioPedido[slug] = units;
    }
  }

  if (removed) savePedido();
  return removed;
}

/* ---------- Catálogo ---------- */

function findCorte(id) {
  return CORTES.find((c) => c.id === id);
}

function findCombo(id) {
  return COMBOS.find((c) => c.id === id);
}

function findAccesorio(id) {
  return ACCESORIOS.find((a) => a.id === id);
}

function kgDeCombo(combo) {
  return Number(combo && combo.kg) || 0;
}

/* ---------- Cortes (por kg) ---------- */

function addToPedido(id, kg) {
  const qty = round2(kg);
  if (!(qty > 0)) return;
  const next = clampCorteFor(id, (pedido[id] || 0) + qty);
  if (!(next > 0)) return;
  pedido[id] = next;
  persistPedido();
  renderDrawer();
  updateOrderCount();
}

function changeQty(id, delta) {
  if (!(id in pedido)) return;
  const next = clampCorteFor(id, pedido[id] + delta);
  if (!(next > 0)) delete pedido[id];
  else pedido[id] = next;
  persistPedido();
  renderDrawer();
  updateOrderCount();
}

function removeFromPedido(id) {
  delete pedido[id];
  persistPedido();
  renderDrawer();
  updateOrderCount();
}

/* ---------- Combos (por unidad) ---------- */

function addComboToPedido(id, units = 1) {
  const combo = findCombo(id);
  const qty = Math.max(1, Math.round(Number(units) || 1));
  if (!combo) return;
  comboPedido[id] = clampUnits((comboPedido[id] || 0) + qty, MAX_COMBO_UNITS);
  persistPedido();
  renderDrawer();
  updateOrderCount();
}

function changeComboQty(id, delta) {
  if (!(id in comboPedido)) return;
  comboPedido[id] = clampUnits(comboPedido[id] + delta, MAX_COMBO_UNITS);
  if (comboPedido[id] <= 0) delete comboPedido[id];
  persistPedido();
  renderDrawer();
  updateOrderCount();
}

function removeComboFromPedido(id) {
  delete comboPedido[id];
  persistPedido();
  renderDrawer();
  updateOrderCount();
}

/* ---------- Accesorios (por unidad) ---------- */

function addAccesorioToPedido(id, units = 1) {
  const accesorio = findAccesorio(id);
  const qty = Math.max(1, Math.round(Number(units) || 1));
  if (!accesorio) return;
  accesorioPedido[id] = clampUnits((accesorioPedido[id] || 0) + qty, MAX_ACCESORIO_UNITS);
  persistPedido();
  renderDrawer();
  updateOrderCount();
}

function changeAccesorioQty(id, delta) {
  if (!(id in accesorioPedido)) return;
  accesorioPedido[id] = clampUnits(accesorioPedido[id] + delta, MAX_ACCESORIO_UNITS);
  if (accesorioPedido[id] <= 0) delete accesorioPedido[id];
  persistPedido();
  renderDrawer();
  updateOrderCount();
}

function removeAccesorioFromPedido(id) {
  delete accesorioPedido[id];
  persistPedido();
  renderDrawer();
  updateOrderCount();
}

/* ---------- Totales ---------- */

/* Los accesorios no aportan kilos: pesan 0. Un pedido sólo de accesorios
   devuelve 0, y por eso el resumen de WhatsApp omite el total de kilos cuando
   no hay carne en el pedido. */
function totalKg() {
  const cortes = Object.values(pedido).reduce((sum, kg) => sum + Number(kg || 0), 0);
  const combos = Object.entries(comboPedido).reduce((sum, [id, units]) => {
    const combo = findCombo(id);
    return sum + kgDeCombo(combo) * units;
  }, 0);
  return round2(cortes + combos);
}

/* Cuenta líneas, no unidades: es lo que ve el cliente en el badge del botón
   "Pedido". Los accesorios cuentan acá o el pago quedaría bloqueado cuando el
   carrito sólo tiene un accesorio. */
function itemCount() {
  return (
    Object.keys(pedido).length +
    Object.keys(comboPedido).length +
    Object.keys(accesorioPedido).length
  );
}

function updateOrderCount() {
  const el = document.getElementById("orderCount");
  if (!el) return;
  const n = itemCount();
  const changed = el.textContent !== String(n);
  el.textContent = n;
  el.classList.toggle("hidden", n === 0);
  if (changed && n > 0) {
    el.classList.remove("pop");
    void el.offsetWidth; // reinicia la animación en cada cambio
    el.classList.add("pop");
  }
}

/* ---------- WhatsApp ---------- */

function buildWhatsAppMessage() {
  const lines = ["Hola MAX Carnes! Quiero hacer un pedido:"];

  for (const [id, kg] of Object.entries(pedido)) {
    const corte = findCorte(id);
    if (!corte) {
      lines.push(`• ${id}: ${kgFmt(kg)}`);
      continue;
    }
    lines.push(`• ${corte.nombre}: ${kgFmt(kg)}`);
  }

  for (const [id, units] of Object.entries(comboPedido)) {
    const combo = findCombo(id);
    if (!combo) {
      lines.push(`• ${id}: ${units} combo(s)`);
      continue;
    }
    lines.push(`• ${combo.nombre} x${units}: ${combo.detalle}`);
  }

  for (const [id, units] of Object.entries(accesorioPedido)) {
    const accesorio = findAccesorio(id);
    if (!accesorio) {
      lines.push(`• ${id}: ${units} unidad(es)`);
      continue;
    }
    lines.push(`• ${accesorio.nombre} x${units}`);
  }

  // Los accesorios no pesan, asi que en un pedido solo de accesorios el total
  // de kilos seria 0. Se omite la linea en vez de mandar "0 kg".
  const kg = totalKg();
  if (kg > 0) lines.push("", `Kilos totales: ${kgFmt(kg)}`);
  return encodeURIComponent(lines.join("\n"));
}

function sendOrderByWhatsApp() {
  if (itemCount() === 0) return;
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${buildWhatsAppMessage()}`;
  window.open(url, "_blank", "noopener");
}
