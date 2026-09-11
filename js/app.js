const kgSelection = {};
let activeCat = "todos";

function formatPrice(n) {
  return "$" + n.toLocaleString("es-AR");
}

function renderCortes(filter = "") {
  const grid = document.getElementById("cortesGrid");
  const emptyMsg = document.getElementById("emptyMsg");
  const q = filter.trim().toLowerCase();
  const list = CORTES.filter(
    (c) =>
      (activeCat === "todos" || c.categoria === activeCat) &&
      c.nombre.toLowerCase().includes(q)
  );

  grid.innerHTML = "";
  emptyMsg.classList.toggle("hidden", list.length > 0);

  list.forEach((corte, idx) => {
    if (!(corte.id in kgSelection)) kgSelection[corte.id] = 1;
    const card = document.createElement("article");
    card.className = "card animate-in";
    card.style.setProperty("--i", idx);
    const subtotal = (kgSelection[corte.id] || 1) * corte.price;
    const foto = corte.img
      ? `<div class="card-img"><img src="${corte.img}" alt="${corte.nombre}" loading="lazy" /></div>`
      : `<div class="card-img placeholder"><span>🥩</span></div>`;
    card.innerHTML = `
      ${foto}
      <span class="card-tag">${corte.categoria === "premium" ? "⭐ Premium" : "Corte Argentino"}</span>
      <div class="card-head">
        <h3>${corte.nombre}</h3>
        <div class="card-price"><strong>${formatPrice(corte.price)}</strong><span>/kg</span></div>
      </div>
      <p class="card-desc">${corte.desc}</p>
      <div class="kg-row">
        <div class="qty">
          <button data-action="minus" data-id="${corte.id}" aria-label="Restar" aria-controls="kg-${corte.id}">−</button>
          <output id="kg-${corte.id}">${kgSelection[corte.id]} kg</output>
          <button data-action="plus" data-id="${corte.id}" aria-label="Sumar" aria-controls="kg-${corte.id}">+</button>
        </div>
        <button class="add-btn" data-action="add" data-id="${corte.id}">Agregar</button>
      </div>
      <p class="card-subtotal" id="subtotal-${corte.id}">Subtotal: ${formatPrice(subtotal)}</p>
    `;
    grid.appendChild(card);
  });
}

function updateCardSubtotal(id) {
  const corte = CORTES.find((c) => c.id === id);
  const el = document.getElementById(`subtotal-${id}`);
  if (corte && el) {
    const subtotal = (kgSelection[id] || 1) * corte.price;
    el.textContent = `Subtotal: ${formatPrice(subtotal)}`;
  }
}

function renderGuia() {
  const grid = document.getElementById("guiaGrid");
  const conMeta = CORTES.filter((c) => c.meta).slice(0, 6);
  for (const corte of conMeta) {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <span class="card-tag">${corte.nombre}</span>
      <p class="card-desc">${corte.desc}</p>
      <div class="guia-meta">
        <div><small>Cocción</small><strong>${corte.meta.coccion}</strong></div>
        <div><small>Punto</small><strong>${corte.meta.punto}</strong></div>
        <div><small>Tiempo</small><strong>${corte.meta.tiempo}</strong></div>
      </div>
    `;
    grid.appendChild(card);
  }
}

function renderCombos() {
  const grid = document.getElementById("combosGrid");
  COMBOS.forEach((combo, idx) => {
    const card = document.createElement("article");
    card.className = "card center-card animate-in";
    card.style.setProperty("--i", idx);
    const save = Math.round(100 - (combo.price / combo.regularPrice) * 100);
    card.innerHTML = `
      <span class="card-icon">${combo.icon}</span>
      <h3>${combo.nombre}</h3>
      <p class="card-desc">${combo.detalle}</p>
      <div class="combo-price">
        <strong>${formatPrice(combo.price)}</strong>
        <span class="combo-regular">${formatPrice(combo.regularPrice)}</span>
        <span class="combo-save">Ahorrás ${save}%</span>
      </div>
      <a class="btn btn-ghost" target="_blank" rel="noopener"
         href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hola MAX Carnes! Me interesa el " + combo.nombre + " (" + combo.detalle + ")")}">
        Consultar
      </a>
    `;
    grid.appendChild(card);
  });
}

function renderDrawer() {
  const wrap = document.getElementById("drawerItems");
  const totalEl = document.getElementById("totalKg");
  const priceEl = document.getElementById("totalPrice");
  const ids = Object.keys(pedido);

  if (ids.length === 0) {
    wrap.innerHTML = `<p class="drawer-empty">Tu pedido está vacío.<br />Agregá cortes desde la sección Cortes.</p>`;
  } else {
    wrap.innerHTML = "";
    for (const id of ids) {
      const corte = CORTES.find((c) => c.id === id);
      const item = document.createElement("div");
      item.className = "drawer-item";
      const subtotal = corte ? corte.price * pedido[id] : 0;
      item.innerHTML = `
        <div class="drawer-item-info">
          <strong>${corte ? corte.nombre : id}</strong>
          <small>${pedido[id]} kg</small>
          ${corte ? `<span class="drawer-price">${formatPrice(corte.price)}/kg · Subtotal ${formatPrice(subtotal)}</span>` : ""}
        </div>
        <div class="qty">
          <button data-action="dec" data-id="${id}" aria-label="Restar">−</button>
          <button data-action="inc" data-id="${id}" aria-label="Sumar">+</button>
        </div>
        <button class="drawer-item-remove" data-action="remove" data-id="${id}" aria-label="Quitar">🗑</button>
      `;
      wrap.appendChild(item);
    }
  }
  totalEl.textContent = `${totalKg()} kg`;
  priceEl.textContent = formatPrice(totalPrice());
}

function openDrawer() {
  const drawer = document.getElementById("drawer");
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  document.getElementById("overlay").classList.add("show");
}

function closeDrawer() {
  const drawer = document.getElementById("drawer");
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  document.getElementById("overlay").classList.remove("show");
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;

  if (action === "minus" || action === "plus") {
    kgSelection[id] = Math.max(1, (kgSelection[id] || 1) + (action === "plus" ? 1 : -1));
    document.getElementById(`kg-${id}`).textContent = `${kgSelection[id]} kg`;
    updateCardSubtotal(id);
  }
  if (action === "add") {
    addToPedido(id, kgSelection[id] || 1);
    btn.textContent = "✓ Agregado";
    btn.disabled = true;
    kgSelection[id] = 1;
    document.getElementById(`kg-${id}`).textContent = "1 kg";
    updateCardSubtotal(id);
    setTimeout(() => {
      btn.textContent = "Agregar";
      btn.disabled = false;
    }, 900);
  }
  if (action === "inc") changeQty(id, 1);
  if (action === "dec") changeQty(id, -1);
  if (action === "remove") removeFromPedido(id);
});

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

const mpStatusEl = () => document.getElementById("mpStatus");
const mpFormEl = () => document.getElementById("card-form-container");
const mpPayBtn = () => document.getElementById("mpPayBtn");

function setMpStatus(msg, type = "") {
  const el = mpStatusEl();
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden", "mp-error", "mp-success");
  if (type) el.classList.add(`mp-${type}`);
}

function setMpFormVisible(visible) {
  const wrap = mpFormEl();
  if (!wrap) return;
  wrap.classList.toggle("hidden", !visible);
}

async function initMercadoPago() {
  if (itemCount() === 0) {
    const items = document.getElementById("drawerItems");
    items.classList.remove("shake");
    void items.offsetWidth;
    items.classList.add("shake");
    return;
  }
  if (typeof MercadoPago === "undefined") {
    setMpStatus("El SDK de Mercado Pago no se pudo cargar.", "error");
    return;
  }
  if (!MP_PUBLIC_KEY || MP_PUBLIC_KEY === "TU_PUBLIC_KEY_MP") {
    setMpStatus("Mercado Pago no está configurado todavía (falta la Public Key).", "error");
    return;
  }

  const btn = mpPayBtn();
  btn.disabled = true;
  setMpStatus("Creando pago…");
  setMpFormVisible(false);

  const payload = { items: Object.entries(pedido).map(([slug, qtyKg]) => ({ slug, qty_kg: qtyKg })) };

  let pref;
  try {
    const res = await fetch(MP_EDGE_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error((data && data.error) || `Error ${res.status}`);
    }
    pref = data;
  } catch (err) {
    console.error("[mp] No se pudo crear la preferencia:", err);
    setMpStatus(String(err.message || err), "error");
    btn.disabled = false;
    return;
  }

  const total = totalPrice();
  const mp = new MercadoPago(MP_PUBLIC_KEY);
  const bricks = mp.bricks();

  try {
    const bricksBuilder = await bricks.create(
      "cardForm",
      "card-form-container",
      {
        initialization: {
          amount: total,
          // El preferenceId lo genera la Edge Function con precios server-side.
          preferenceId: pref.id,
        },
        callbacks: {
          onFormInitialize() {
            setMpStatus("");
            setMpFormVisible(true);
            btn.classList.add("hidden");
          },
          onStatusChange({ status, statusDetail }) {
            // NOTA DE SEGURIDAD: este `status` es informativo de UI (UX) y NO
            // confirma el pago. La confirmación real es server-side: la Edge
            // Function mp-webhook valida el pago contra la API de Mercado Pago
            // y recién entonces marca la orden 'orders.status' como 'paid'.
            if (status === "approved") {
              // Pago aprobado: limpiar pedido y mostrar confirmación.
              pedido = {};
              savePedido();
              renderDrawer();
              updateOrderCount();
              setMpStatus("¡Pago aprobado! Te confirmamos la entrega por WhatsApp.", "success");
              btn.classList.remove("hidden");
              btn.disabled = false;
            } else if (status === "pending") {
              setMpStatus("Pago pendiente de acreditación.", "");
            } else if (status === "rejected") {
              setMpStatus(
                `El pago fue rechazado (${statusDetail || "intentá otra tarjeta"}). Tu pedido sigue armado.`,
                "error",
              );
              btn.classList.remove("hidden");
              btn.disabled = false;
            }
          },
        },
      },
    );
    await bricksBuilder.mount("#card-form-container");
  } catch (err) {
    console.error("[mp] No se pudo montar el Brick:", err);
    setMpStatus("No se pudo mostrar el formulario de pago. Podés usar WhatsApp.", "error");
    btn.disabled = false;
  }
}

document.getElementById("mpPayBtn").addEventListener("click", initMercadoPago);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDrawer();
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

document.getElementById("searchInput").addEventListener("input", (e) => {
  renderCortes(e.target.value);
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
      if (statusEl) statusEl.textContent = "Catálogo en vivo desde Supabase";
    } else if (statusEl) {
      statusEl.textContent = "Catálogo local (supabase sin datos)";
    }
  } catch (err) {
    console.warn(err);
    if (statusEl) statusEl.textContent = "Catálogo local";
  }
  renderCortes();
  renderCombos();
  renderDrawer();
  updateOrderCount();
  document.getElementById("bootSkeleton")?.classList.add("hidden");
}

bootstrap();

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
