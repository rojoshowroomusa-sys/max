const kgSelection = {};
const comboSelection = {};
let activeCat = "todos";
let activeSort = "destacado";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[char]);
}

/* Ordena el catálogo. "destacado" conserva el orden curado a mano. */
function sortCortes(list) {
  const arr = list.slice();
  if (activeSort === "nombre") arr.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return arr;
}

function renderCortes(filter = "") {
  const grid = document.getElementById("cortesGrid");
  const emptyMsg = document.getElementById("emptyMsg");
  const clearBtn = document.getElementById("clearFiltersBtn");
  const countEl = document.getElementById("cortesCount");
  const q = filter.trim().toLowerCase();
  const list = sortCortes(
    CORTES.filter(
      (c) =>
        (activeCat === "todos" || c.categoria === activeCat) &&
        c.nombre.toLowerCase().includes(q)
    )
  );

  grid.replaceChildren();
  emptyMsg.classList.toggle("hidden", list.length > 0);
  if (clearBtn) clearBtn.classList.toggle("hidden", list.length > 0);
  if (countEl) {
    countEl.textContent = list.length
      ? `${list.length} ${list.length === 1 ? "corte" : "cortes"}`
      : "Sin resultados";
  }

  list.forEach((corte, idx) => {
    const minKg = corteMinKg(corte);
    const maxKg = corteMaxKg(corte);
    // La selección se normaliza contra el rango vendible: un carrito guardado
    // con un kilaje hoy inválido (p. ej. stock bajó) se ajusta al tope.
    const kg = clampCorteFor(corte.id, kgSelection[corte.id] || Math.max(minKg, 1));
    kgSelection[corte.id] = kg;
    const card = document.createElement("article");
    card.className = "card animate-in";
    card.style.setProperty("--i", idx);
    const safeId = escapeHtml(corte.id);
    const safeName = escapeHtml(corte.nombre);
    const safeImage = escapeHtml(corte.img);
    const foto = corte.img
      ? `<div class="card-img"><img src="${safeImage}" alt="${safeName}" loading="lazy" /></div>`
      : `<div class="card-img placeholder" aria-hidden="true"><span>🥩</span></div>`;
    const coccion = corte.meta && corte.meta.coccion;
    const showRange = Number.isFinite(Number(corte.maxG)) && Number(corte.maxG) > 0;
    const limitLine = showRange
      ? `<p class="card-limit">Mínimo ${kgFmt(minKg)} · máximo ${kgFmt(maxKg)}</p>`
      : "";
    card.innerHTML = `
      ${foto}
      <span class="card-tag">${corte.categoria === "especiales" ? "⭐ Especial" : "Corte Argentino"}</span>
      <div class="card-head">
        <h3>${safeName}</h3>
      </div>
      <p class="card-desc">${escapeHtml(corte.desc)}</p>
      ${coccion ? `<p class="card-meta-line"><span class="card-meta-key">Cocción</span>${escapeHtml(coccion)}</p>` : ""}
      <div class="kg-row">
        <div class="qty">
          <button data-action="minus" data-id="${safeId}" aria-label="Restar ${kgFmt(CORTE_STEP_KG)} de ${safeName}" aria-controls="kg-${safeId}" ${kg <= minKg ? "disabled" : ""}>−</button>
          <output id="kg-${safeId}">${kgFmt(kg)}</output>
          <button data-action="plus" data-id="${safeId}" aria-label="Sumar ${kgFmt(CORTE_STEP_KG)} de ${safeName}" aria-controls="kg-${safeId}" ${kg >= maxKg ? "disabled" : ""}>+</button>
        </div>
        <button class="add-btn" data-action="add" data-id="${safeId}"
          aria-label="Agregar ${kgFmt(kg)} de ${safeName} al pedido">Agregar</button>
      </div>
      ${limitLine}
    `;
    grid.appendChild(card);
  });
}

/* Refresca output y botones ± de una ficha tras cambiar el kilaje. */
function syncCorteStepper(id) {
  const corte = findCorte(id);
  const kg = kgSelection[id] || 1;
  const minKg = corteMinKg(corte);
  const maxKg = corteMaxKg(corte);
  const output = document.getElementById(`kg-${id}`);
  if (!output) return;
  output.textContent = kgFmt(kg);
  const qtyBox = output.closest(".qty");
  if (qtyBox) {
    const minus = qtyBox.querySelector('[data-action="minus"]');
    const plus = qtyBox.querySelector('[data-action="plus"]');
    if (minus) minus.disabled = kg <= minKg + 0.001;
    if (plus) plus.disabled = kg >= maxKg - 0.001;
  }
}

/* Igual que syncCorteStepper pero para la cantidad de combos (unidades). */
function syncComboStepper(id) {
  const units = comboSelection[id] || 1;
  const output = document.getElementById(`combo-units-${id}`);
  if (!output) return;
  output.textContent = units;
  const qtyBox = output.closest(".qty");
  if (qtyBox) {
    const minus = qtyBox.querySelector('[data-action="combo-minus"]');
    const plus = qtyBox.querySelector('[data-action="combo-plus"]');
    if (minus) minus.disabled = units <= 1;
    if (plus) plus.disabled = units >= MAX_COMBO_UNITS;
  }
}

function renderGuia() {
  const grid = document.getElementById("guiaGrid");
  grid.replaceChildren();
  const conMeta = CORTES.filter((c) => c.meta).slice(0, 6);
  for (const corte of conMeta) {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <span class="card-tag">${escapeHtml(corte.nombre)}</span>
      <p class="card-desc">${escapeHtml(corte.desc)}</p>
      <div class="guia-meta">
        <div><small>Cocción</small><strong>${escapeHtml(corte.meta.coccion)}</strong></div>
        <div><small>Punto</small><strong>${escapeHtml(corte.meta.punto)}</strong></div>
        <div><small>Tiempo</small><strong>${escapeHtml(corte.meta.tiempo)}</strong></div>
      </div>
    `;
    grid.appendChild(card);
  }
}

function renderCombos() {
  const grid = document.getElementById("combosGrid");
  grid.replaceChildren();

  COMBOS.forEach((combo, idx) => {
    if (!(combo.id in comboSelection)) comboSelection[combo.id] = 1;
    const units = comboSelection[combo.id] || 1;
    const safeId = escapeHtml(combo.id);
    const safeName = escapeHtml(combo.nombre);
    const card = document.createElement("article");
    card.className = "card center-card combo-card animate-in";
    card.style.setProperty("--i", idx);
    card.innerHTML = `
      <span class="card-icon" aria-hidden="true">${escapeHtml(combo.icon)}</span>
      <h3>${safeName}</h3>
      <span class="combo-weight">${Number(combo.kg || 0).toLocaleString("es-AR")} kg incluidos</span>
      <p class="card-desc">${escapeHtml(combo.detalle)}</p>
      <div class="combo-actions">
        <div class="qty" role="group" aria-label="Cantidad de ${safeName}">
          <button data-action="combo-minus" data-id="${safeId}" aria-label="Restar un combo ${safeName}" aria-controls="combo-units-${safeId}" ${units <= 1 ? "disabled" : ""}>−</button>
          <output id="combo-units-${safeId}">${units}</output>
          <button data-action="combo-plus" data-id="${safeId}" aria-label="Sumar un combo ${safeName}" aria-controls="combo-units-${safeId}" ${units >= MAX_COMBO_UNITS ? "disabled" : ""}>+</button>
        </div>
        <button class="add-btn" data-action="combo-add" data-id="${safeId}"
          aria-label="Agregar ${units} ${units === 1 ? "combo" : "combos"} ${safeName} al pedido">Agregar</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderDrawer() {
  const wrap = document.getElementById("drawerItems");
  const totalEl = document.getElementById("totalKg");
  const corteIds = Object.keys(pedido);
  const comboIds = Object.keys(comboPedido);

  wrap.replaceChildren();
  if (corteIds.length === 0 && comboIds.length === 0) {
    wrap.innerHTML = `<p class="drawer-empty">Tu pedido está vacio.<br />Agregá cortes o combos desde el catálogo.</p>`;
  } else {
    for (const id of corteIds) {
      const corte = findCorte(id);
      const kg = pedido[id];
      const safeId = escapeHtml(id);
      const safeName = escapeHtml(corte ? corte.nombre : id);
      const atMax = corte ? kg >= corteMaxKg(corte) - 0.001 : false;
      const item = document.createElement("div");
      item.className = "drawer-item";
      item.innerHTML = `
        <div class="drawer-item-info">
          <span class="drawer-item-kind">Corte</span>
          <strong>${safeName}</strong>
          <small>${kgFmt(kg)}</small>
        </div>
        <div class="qty">
          <button data-action="item-dec" data-kind="corte" data-id="${safeId}" aria-label="Restar ${kgFmt(CORTE_STEP_KG)} de ${safeName}">−</button>
          <button data-action="item-inc" data-kind="corte" data-id="${safeId}" aria-label="Sumar ${kgFmt(CORTE_STEP_KG)} de ${safeName}" ${atMax ? "disabled" : ""}>+</button>
        </div>
        <button class="drawer-item-remove" data-action="item-remove" data-kind="corte" data-id="${safeId}" aria-label="Quitar ${safeName}">Quitar</button>
      `;
      wrap.appendChild(item);
    }

    for (const id of comboIds) {
      const combo = findCombo(id);
      const units = comboPedido[id];
      const safeId = escapeHtml(id);
      const safeName = escapeHtml(combo ? combo.nombre : id);
      const kg = Number(combo && combo.kg) || 0;
      const item = document.createElement("div");
      item.className = "drawer-item";
      item.innerHTML = `
        <div class="drawer-item-info">
          <span class="drawer-item-kind combo">Combo</span>
          <strong>${safeName}</strong>
          <small>${units} ${units === 1 ? "combo" : "combos"}${kg ? ` · ${kg * units} kg` : ""}</small>
        </div>
        <div class="qty">
          <button data-action="item-dec" data-kind="combo" data-id="${safeId}" aria-label="Restar un combo ${safeName}">−</button>
          <button data-action="item-inc" data-kind="combo" data-id="${safeId}" aria-label="Sumar un combo ${safeName}" ${units >= MAX_COMBO_UNITS ? "disabled" : ""}>+</button>
        </div>
        <button class="drawer-item-remove" data-action="item-remove" data-kind="combo" data-id="${safeId}" aria-label="Quitar ${safeName}">Quitar</button>
      `;
      wrap.appendChild(item);
    }
  }
  totalEl.textContent = kgFmt(totalKg());
}

let drawerLastFocus = null;

function openDrawer() {
  const drawer = document.getElementById("drawer");
  if (drawer.classList.contains("open")) return;
  drawerLastFocus = document.activeElement;
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  drawer.inert = false;
  document.getElementById("overlay").classList.add("show");
  document.body.classList.add("no-scroll");
  document.getElementById("closeDrawerBtn").focus();
}

function closeDrawer() {
  const drawer = document.getElementById("drawer");
  if (!drawer.classList.contains("open")) return;
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  drawer.inert = true;
  document.getElementById("overlay").classList.remove("show");
  document.body.classList.remove("no-scroll");
  if (drawerLastFocus && typeof drawerLastFocus.focus === "function") {
    drawerLastFocus.focus();
  }
  drawerLastFocus = null;
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const { action, id, kind } = btn.dataset;

  if (action === "minus" || action === "plus") {
    const base = kgSelection[id] ?? 1;
    const delta = action === "plus" ? CORTE_STEP_KG : -CORTE_STEP_KG;
    const next = clampCorteFor(id, round2(base + delta));
    if (next > 0) kgSelection[id] = next;
    syncCorteStepper(id);
  }

  if (action === "add") {
    addToPedido(id, kgSelection[id] || 1);
    btn.textContent = "✓ Agregado";
    btn.disabled = true;
    kgSelection[id] = clampCorteFor(id, Math.max(corteMinKg(findCorte(id)), 1)) || 1;
    syncCorteStepper(id);
    setTimeout(() => {
      btn.textContent = "Agregar";
      btn.disabled = false;
    }, 900);
  }

  if (action === "combo-minus" || action === "combo-plus") {
    const base = comboSelection[id] ?? 1;
    comboSelection[id] = Math.min(
      MAX_COMBO_UNITS,
      Math.max(1, base + (action === "combo-plus" ? 1 : -1)),
    );
    syncComboStepper(id);
  }

  if (action === "combo-add") {
    addComboToPedido(id, comboSelection[id] || 1);
    btn.textContent = "✓ Agregado";
    btn.disabled = true;
    comboSelection[id] = 1;
    syncComboStepper(id);
    setTimeout(() => {
      btn.textContent = "Agregar";
      btn.disabled = false;
    }, 900);
  }

  if (action === "item-inc" || action === "item-dec") {
    const delta = action === "item-inc" ? 1 : -1;
    if (kind === "combo") changeComboQty(id, delta);
    else changeQty(id, delta * CORTE_STEP_KG);
    refocusDrawerItem(action, kind, id);
  }

  if (action === "item-remove") {
    if (kind === "combo") removeComboFromPedido(id);
    else removeFromPedido(id);
    refocusDrawerItem(action, kind, id);
  }
});

/* El drawer se re-renderiza tras cada mutación: si el botón presionado ya no
   está (o quedó deshabilitado), el foco vuelve a un control seguro dentro del
   drawer en lugar de caer al body. */
function refocusDrawerItem(action, kind, id) {
  const find = (a) =>
    document.querySelector(
      `#drawerItems [data-action="${a}"][data-kind="${kind}"][data-id="${id}"]`,
    );
  const target = [action, "item-remove", "item-inc", "item-dec"]
    .map(find)
    .find((el) => el && !el.disabled);
  if (target) {
    target.focus();
    return;
  }
  document.getElementById("closeDrawerBtn").focus();
}

function sendOrderByWhatsAppFeedback() {
  if (itemCount() === 0) {
    const items = document.getElementById("drawerItems");
    items.classList.remove("shake");
    void items.offsetWidth;
    items.classList.add("shake");
    return;
  }
  sendOrderByWhatsApp();
}

/* ---------------- Mercado Pago --------------- */

const MP_CHECKOUT_KEY = "max_checkout_pendiente";
const mpStatusEl = () => document.getElementById("mpStatus");
const mpPayBtn = () => document.getElementById("mpPayBtn");

function setMpStatus(msg, type = "") {
  const el = mpStatusEl();
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden", "mp-error", "mp-success");
  if (type) el.classList.add(`mp-${type}`);
}

/* El navegador NO confirma pagos: sólo evita abrir un segundo checkout para el
   mismo pedido mientras el primero está sin resolver, que es la forma real de
   cobrar dos veces. Se marca al redirigir y se limpia al cambiar el carrito o
   al volver con un pago fallido. */
function getPendingCheckout() {
  try {
    const raw = sessionStorage.getItem(MP_CHECKOUT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setPendingCheckout(data) {
  try {
    if (data) sessionStorage.setItem(MP_CHECKOUT_KEY, JSON.stringify(data));
    else sessionStorage.removeItem(MP_CHECKOUT_KEY);
  } catch (err) {
    console.warn("[mp] No se pudo guardar el estado del checkout:", err);
  }
}

/* El marcador es sólo una protección de UX. Si el carrito cambió en otra
   pestaña o en otra interacción, el marcador viejo no debe bloquear el nuevo
   pedido. */
function pendingCheckoutForCurrentCart() {
  const pending = getPendingCheckout();
  if (!pending) return null;
  if (pending.cartKey && pending.cartKey !== checkoutCartKey()) {
    setPendingCheckout(null);
    return null;
  }
  return pending;
}

function lockPayButton(locked, label) {
  const btn = mpPayBtn();
  if (!btn) return;
  btn.disabled = locked;
  if (label) btn.textContent = label;
  else btn.textContent = "Pagá con Mercado Pago";
}

/* Cambiar el pedido es una intención nueva: se libera el checkout pendiente
   para que el cliente pueda pagar un carrito distinto sin quedar bloqueado.
   Se ejecuta también cuando el bloqueo proviene sólo del retorno #/ok o
   #/pending, aunque el marcador no haya quedado disponible. */
function onPedidoChanged() {
  setPendingCheckout(null);
  lockPayButton(false);
}

function showCheckoutReturnMessage() {
  const messages = {
    "#/ok": {
      text: "La operación volvió de Mercado Pago. Esperamos la confirmación del pago.",
      status: "Pago en verificación",
      type: "",
    },
    "#/pending": {
      text: "El pago todavía está siendo procesado. Tu pedido sigue guardado.",
      status: "Pago en verificación",
      type: "",
    },
    "#/error": {
      text: "El pago no se completó. Tu pedido sigue armado; podés intentar nuevamente.",
      status: "Pago no completado",
      type: "error",
    },
  };
  const message = messages[window.location.hash];
  if (!message) return;

  // Un pago fallido libera el carrito para reintentar; los demás mantienen el
  // bloqueo para no generar una segunda orden sobre el mismo pedido. Aunque
  // sessionStorage se haya perdido al volver, #/ok y #/pending siguen siendo
  // una señal suficiente para bloquear el botón.
  if (window.location.hash === "#/error") {
    setPendingCheckout(null);
    lockPayButton(false);
  }

  setMpStatus(message.text, message.type);
  const statusEl = document.getElementById("dataStatus");
  if (statusEl) {
    statusEl.textContent = message.status;
    statusEl.classList.remove("hidden");
  }
  if (window.location.hash !== "#/error" && itemCount() > 0) {
    lockPayButton(true, "Pago en curso…");
  } else {
    lockPayButton(false);
  }
}

function checkoutCartKey() {
  return JSON.stringify(buildMpPayload());
}

function buildMpPayload() {
  return {
    items: [
      ...Object.entries(pedido).map(([slug, qty]) => ({ kind: "corte", slug, qty })),
      ...Object.entries(comboPedido).map(([slug, qty]) => ({ kind: "combo", slug, qty })),
    ],
  };
}

async function requestMpPreference(payload) {
  const res = await fetch(MP_EDGE_FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data && data.error) || `Error ${res.status}`);
  }
  return data;
}

async function initMercadoPago() {
  if (itemCount() === 0) {
    const items = document.getElementById("drawerItems");
    items.classList.remove("shake");
    void items.offsetWidth;
    items.classList.add("shake");
    return;
  }

  // Un checkout sin resolver para este mismo pedido no se duplica: generar
  // otra Preference cobraría dos veces por el mismo carrito. Un marcador de
  // otra versión del carrito se descarta para no bloquear un pedido nuevo.
  const pending = pendingCheckoutForCurrentCart();
  if (pending) {
    lockPayButton(true, "Pago en curso…");
    setMpStatus(
      "Ya hay un pago en curso para este pedido. Si no lo completaste, recargá la página o esperá la confirmación.",
    );
    return;
  }

  const btn = mpPayBtn();
  if (!btn) return;
  const payload = buildMpPayload();
  const cartKey = checkoutCartKey();
  lockPayButton(true, "Preparando…");
  setMpStatus("Preparando el pago…");

  let pref;
  try {
    pref = await requestMpPreference(payload);
  } catch (err) {
    console.error("[mp] No se pudo crear la preferencia:", err);
    setMpStatus(String(err.message || err), "error");
    lockPayButton(false);
    return;
  }

  // El servidor pudo crear la Preference mientras el usuario modificaba el
  // carrito. No navegamos a una Preference vieja: el pedido que se debe cobrar
  // es el que había cuando empezó el checkout.
  if (checkoutCartKey() !== cartKey) {
    setPendingCheckout(null);
    setMpStatus("Tu pedido cambió mientras preparábamos el pago. Revisalo e intentá de nuevo.", "error");
    lockPayButton(false);
    return;
  }

  if (!pref || typeof pref !== "object") {
    setMpStatus("La pasarela de pago devolvió una respuesta inválida. Intentá de nuevo.", "error");
    lockPayButton(false);
    return;
  }
  const total = Number(pref.total);
  const checkoutUrl = String(pref.checkout_url || pref.init_point || "");
  if (!Number.isFinite(total) || total <= 0 || !checkoutUrl) {
    setMpStatus("El servidor no devolvió una preferencia válida. Intentá de nuevo.", "error");
    lockPayButton(false);
    return;
  }

  try {
    const parsedUrl = new URL(checkoutUrl);
    if (parsedUrl.protocol !== "https:") throw new Error("URL de checkout inválida");
  } catch {
    setMpStatus("No pudimos abrir el checkout de Mercado Pago. Intentá de nuevo.", "error");
    lockPayButton(false);
    return;
  }

  setMpStatus("Te llevamos a Mercado Pago para completar el pago…");
  // Se registra la Preference antes de navegar: si la redirección funciona,
  // el botón queda bloqueado al volver y no se puede cobrar dos veces.
  setPendingCheckout({
    preferenceId: String(pref.id || ""),
    at: Date.now(),
    cartKey,
  });
  try {
    window.location.assign(checkoutUrl);
  } catch (err) {
    console.error("[mp] No se pudo redirigir al checkout:", err);
    setPendingCheckout(null);
    setMpStatus("No pudimos abrir Mercado Pago. Podés intentar nuevamente.", "error");
    lockPayButton(false);
  }
}

document.getElementById("mpPayBtn").addEventListener("click", initMercadoPago);

document.addEventListener("keydown", (e) => {
  const drawer = document.getElementById("drawer");
  const drawerOpen = drawer.classList.contains("open");

  if (e.key === "Escape") {
    closeDrawer();
    return;
  }

  // Mientras el drawer está abierto el Tab queda atrapado dentro: el resto de
  // la página es inert y no debería recibir foco.
  if (!drawerOpen || e.key !== "Tab") return;
  const focusables = drawer.querySelectorAll(
    'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === first || !drawer.contains(active))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (active === last || !drawer.contains(active))) {
    e.preventDefault();
    first.focus();
  }
});

document.getElementById("orderBtn").addEventListener("click", openDrawer);
document.getElementById("closeDrawerBtn").addEventListener("click", closeDrawer);
document.getElementById("overlay").addEventListener("click", closeDrawer);
document.getElementById("sendOrderBtn").addEventListener("click", sendOrderByWhatsAppFeedback);

const navToggle = document.getElementById("navToggle");
const mainNav = document.getElementById("mainNav");
navToggle.addEventListener("click", () => {
  const open = mainNav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
  navToggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
});
mainNav.addEventListener("click", (e) => {
  if (e.target.closest("a")) {
    mainNav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Abrir menú");
  }
});

const searchInput = document.getElementById("searchInput");
let searchTimer;
searchInput.addEventListener("input", (e) => {
  const value = e.target.value;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => renderCortes(value), 120);
});

document.getElementById("sortSelect").addEventListener("change", (e) => {
  activeSort = e.target.value;
  renderCortes(searchInput.value);
});

document.getElementById("catChips").addEventListener("click", (e) => {
  const btn = e.target.closest(".chip-btn");
  if (!btn) return;
  activeCat = btn.dataset.cat;
  document
    .querySelectorAll("#catChips .chip-btn")
    .forEach((b) => b.classList.toggle("active", b === btn));
  renderCortes(document.getElementById("searchInput").value);
});

const clearFiltersBtn = document.getElementById("clearFiltersBtn");
if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener("click", () => {
    searchInput.value = "";
    activeCat = "todos";
    document
      .querySelectorAll("#catChips .chip-btn")
      .forEach((b) => b.classList.toggle("active", b.dataset.cat === "todos"));
    renderCortes("");
    searchInput.focus();
  });
}

document.getElementById("altaComercialBtn").href =
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hola MAX Carnes! Quiero solicitar el alta comercial mayorista.")}`;

loadPedido();
renderGuia();

async function bootstrap() {
  const statusEl = document.getElementById("dataStatus");
  if (statusEl) {
    statusEl.textContent = "Conectando catálogo…";
    statusEl.classList.remove("hidden");
  }
  try {
    const catalog = await loadCatalog();
    if (catalog) {
      CORTES = catalog.products;
      COMBOS = catalog.combos;
      if (statusEl) statusEl.textContent = "Catálogo actualizado";
    } else if (statusEl) {
      statusEl.textContent = "Catálogo de respaldo (sin conexión)";
    }
  } catch (err) {
    console.warn(err);
    if (statusEl) statusEl.textContent = "Catálogo de respaldo (sin conexión)";
  }

  // El contador del hero sigue al catálogo real (los cortes se suman o
  // retiran con migraciones).
  const heroCount = document.getElementById("heroCortes");
  if (heroCount && CORTES.length) heroCount.textContent = `+${CORTES.length}`;

  // El carrito se depura contra el catálogo activo: un corte o combo que ya no
  // está disponible se quita en lugar de hacer fallar todo el checkout.
  const removedLines = reconcilePedidoWithCatalog();
  if (removedLines) {
    setMpStatus(
      "Actualizamos tu pedido: quitamos " +
        `${removedLines} producto${removedLines === 1 ? "" : "s"} que ya no está disponible.`,
    );
  }

  renderCortes();
  renderCombos();
  renderDrawer();
  updateOrderCount();
  document.getElementById("bootSkeleton")?.classList.add("hidden");
}

bootstrap().then(showCheckoutReturnMessage);

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-in");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.1 }
  );
  document.querySelectorAll(".card:not(.animate-in)").forEach((el) => observer.observe(el));
}
