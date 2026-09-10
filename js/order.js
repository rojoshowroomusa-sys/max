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
  return Object.entries(pedido).reduce((sum, [id, kg]) => {
    const corte = CORTES.find((c) => c.id === id);
    return sum + (corte ? corte.price * kg : 0);
  }, 0);
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
  let total = 0;
  for (const [id, kg] of Object.entries(pedido)) {
    const corte = CORTES.find((c) => c.id === id);
    const subtotal = corte ? corte.price * kg : 0;
    total += subtotal;
    lines.push(
      corte
        ? `• ${corte.nombre}: ${kg} kg x $${corte.price.toLocaleString("es-AR")} = $${subtotal.toLocaleString("es-AR")}`
        : `• ${id}: ${kg} kg`
    );
  }
  lines.push("", `Kilos totales: ${totalKg()} kg`, `Total estimado: $${total.toLocaleString("es-AR")}`);
  return encodeURIComponent(lines.join("\n"));
}

function sendOrderByWhatsApp() {
  if (itemCount() === 0) return;
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${buildWhatsAppMessage()}`;
  window.open(url, "_blank", "noopener");
}
