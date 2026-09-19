const ORDER_KEY = "max_pedido_v1";

let pedido = {};

function loadPedido() {
  try {
    pedido = JSON.parse(localStorage.getItem(ORDER_KEY)) || {};
  } catch {
    pedido = {};
  }
}

function savePedido() {
  localStorage.setItem(ORDER_KEY, JSON.stringify(pedido));
}

function addToPedido(id, kg) {
  if (kg <= 0) return;
  pedido[id] = (pedido[id] || 0) + kg;
  savePedido();
  renderDrawer();
  updateOrderCount();
}

function changeQty(id, delta) {
  if (!pedido[id]) return;
  pedido[id] += delta;
  if (pedido[id] <= 0) delete pedido[id];
  savePedido();
  renderDrawer();
  updateOrderCount();
}

function removeFromPedido(id) {
  delete pedido[id];
  savePedido();
  renderDrawer();
  updateOrderCount();
}

function totalKg() {
  return Math.round(Object.values(pedido).reduce((a, b) => a + b, 0) * 100) / 100;
}

function totalPrice() {
  return 0;
}

function itemCount() {
  return Object.keys(pedido).length;
}

function updateOrderCount() {
  const el = document.getElementById("orderCount");
  const n = itemCount();
  el.textContent = n;
  el.classList.toggle("hidden", n === 0);
}

function buildWhatsAppMessage() {
  const lines = ["Hola MAX Carnes! Quiero hacer un pedido:"];
  for (const [id, kg] of Object.entries(pedido)) {
    const corte = CORTES.find((c) => c.id === id);
    lines.push(
      corte
        ? `• ${corte.nombre}: ${kg} kg`
        : `• ${id}: ${kg} kg`
    );
  }
  lines.push("", `Kilos totales: ${totalKg()} kg`);
  return encodeURIComponent(lines.join("\n"));
}

function sendOrderByWhatsApp() {
  if (itemCount() === 0) return;
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${buildWhatsAppMessage()}`;
  window.open(url, "_blank", "noopener");
}
