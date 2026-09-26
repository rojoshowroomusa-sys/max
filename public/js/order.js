const ORDER_KEY = "max_pedido_v2";
const LEGACY_ORDER_KEY = "max_pedido_v1";

/* Límites por línea. Deben coincidir con MAX_CORTE_KG / MAX_COMBO_UNITS de
   supabase/functions/create-mp-preference/index.ts. Acá sólo se avisa; la
   validación real siempre es server-side. */
const MAX_CORTE_KG = 100;
const MAX_COMBO_UNITS = 20;

/* Dos mapas porque los cortes se venden por kg y los combos por unidad
   con precio cerrado. Se guardan juntos bajo una sola clave. */
let pedido = {}; // slug -> kg        (cortes sueltos)
let comboPedido = {}; // slug -> unidades (combos armados)

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function clampCorteKg(value) {
  return Math.min(MAX_CORTE_KG, round2(value));
}

function clampComboUnits(value) {
  return Math.min(MAX_COMBO_UNITS, Math.max(0, Math.round(Number(value) || 0)));
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

const moneyFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function fmtMoney(value) {
  return moneyFmt.format(Number(value) || 0);
}

function kgFmt(value) {
  return `${Number(value).toLocaleString("es-AR")} kg`;
}

function corteSubtotal(corte, kg) {
  return round2((Number(corte && corte.price) || 0) * Number(kg || 0));
}

function comboSubtotal(combo, units) {
  return round2((Number(combo && combo.price) || 0) * Number(units || 0));
}

function totalEstimado() {
  const cortes = Object.entries(pedido).reduce(
    (sum, [id, kg]) => sum + corteSubtotal(findCorte(id), kg),
    0,
  );
  const combos = Object.entries(comboPedido).reduce(
    (sum, [id, units]) => sum + comboSubtotal(findCombo(id), units),
    0,
  );
  return round2(cortes + combos);
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

/* Descarta valores corruptos o negativos que could've quedado guardados. */
function sanitizeCartMap(raw, integerValues = false) {
  if (!isObject(raw)) return {};
  const clean = {};
  for (const [id, rawQty] of Object.entries(raw)) {
    const qty = Number(rawQty);
    if (!id || !Number.isFinite(qty) || qty <= 0) continue;
    const normalized = integerValues ? Math.round(qty) : round2(qty);
    if (!(normalized > 0)) continue;
    const max = integerValues ? MAX_COMBO_UNITS : MAX_CORTE_KG;
    clean[id] = Math.min(max, normalized);
  }
  return clean;
}

/* Migra carritos guardados con el formato viejo (plano = cortes). */
function loadPedido() {
  try {
    const stored = localStorage.getItem(ORDER_KEY);
    const raw = stored ? JSON.parse(stored) : null;

    if (isObject(raw) && (isObject(raw.cortes) || isObject(raw.combos))) {
      pedido = sanitizeCartMap(raw.cortes);
      comboPedido = sanitizeCartMap(raw.combos, true);
      return;
    }

    const legacy = JSON.parse(localStorage.getItem(LEGACY_ORDER_KEY) || "null");
    pedido = sanitizeCartMap(legacy);
    comboPedido = {};
    if (Object.keys(pedido).length) savePedido();
  } catch {
    pedido = {};
    comboPedido = {};
  }
}

function savePedido() {
  try {
    localStorage.setItem(ORDER_KEY, JSON.stringify({ cortes: pedido, combos: comboPedido }));
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
    const units = clampComboUnits(comboPedido[slug]);
    if (!(units > 0)) {
      delete comboPedido[slug];
      removed += 1;
    } else {
      comboPedido[slug] = units;
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
  comboPedido[id] = clampComboUnits((comboPedido[id] || 0) + qty);
  persistPedido();
  renderDrawer();
  updateOrderCount();
}

function changeComboQty(id, delta) {
  if (!(id in comboPedido)) return;
  comboPedido[id] = clampComboUnits(comboPedido[id] + delta);
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

/* ---------- Totales ---------- */

function totalKg() {
  const cortes = Object.values(pedido).reduce((sum, kg) => sum + Number(kg || 0), 0);
  const combos = Object.entries(comboPedido).reduce((sum, [id, units]) => {
    const combo = findCombo(id);
    return sum + kgDeCombo(combo) * units;
  }, 0);
  return round2(cortes + combos);
}

function itemCount() {
  return Object.keys(pedido).length + Object.keys(comboPedido).length;
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
    lines.push(`• ${corte.nombre}: ${kgFmt(kg)} — ${fmtMoney(corteSubtotal(corte, kg))}`);
  }

  for (const [id, units] of Object.entries(comboPedido)) {
    const combo = findCombo(id);
    if (!combo) {
      lines.push(`• ${id}: ${units} combo(s)`);
      continue;
    }
    lines.push(
      `• ${combo.nombre} x${units} — ${fmtMoney(comboSubtotal(combo, units))} (${combo.detalle})`,
    );
  }

  lines.push(
    "",
    `Kilos totales: ${kgFmt(totalKg())}`,
    `Total estimado: ${fmtMoney(totalEstimado())}`,
  );
  return encodeURIComponent(lines.join("\n"));
}

function sendOrderByWhatsApp() {
  if (itemCount() === 0) return;
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${buildWhatsAppMessage()}`;
  window.open(url, "_blank", "noopener");
}
