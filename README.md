# MAX Carnes Premium 🥩

Tienda online de carnes premium argentinas. Emprendimiento familiar con cortes de calidad, combos comprables y pago online con Mercado Pago o pedido por WhatsApp.

**URL del repositorio:** https://github.com/rojoshowroomusa-sys/max

---

## 📋 Tabla de contenidos

- [Descripción](#descripción)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Características](#características)
- [Logo y marca](#logo-y-marca)
- [Diseño visual](#diseño-visual)
- [Arquitectura frontend](#arquitectura-frontend)
- [Base de datos (Supabase)](#base-de-datos-supabase)
- [Instalación local](#instalación-local)
- [Funcionamiento del pedido](#funcionamiento-del-pedido)
- [Accesibilidad](#accesibilidad)
- [Próximos pasos](#próximos-pasos)
- [Cambios recientes](#cambios-recientes)
- [Licencia](#licencia)

---

## Descripción

MAX Carnes Premium es un sitio web para la venta directa de carnes argentinas. El usuario navega el catálogo, selecciona cortes por kilo o combos por unidad, arma su pedido y puede pagarlo con Mercado Pago o enviarlo por WhatsApp. La tienda también ofrece una guía de cocción, testimonios y preguntas frecuentes.

El backend se apoya en Supabase para el catálogo, cajas recurrentes, suscripciones de usuarios y recetas.

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | HTML5, CSS3, JavaScript vanilla (ES6+) |
| Tipografía | Google Fonts — Oswald (titulares) |
| Backend/DB | Supabase (PostgreSQL + Auth + RLS) |
| Hosting/Edge | Cloudflare Workers (wrangler.jsonc) |
| Persistencia del carrito | localStorage |
| Comunicación | WhatsApp (wa.me) + Mercado Pago Checkout Pro |

---

## Estructura del proyecto

```
max/
├── public/                      # ÚNICO directorio publicado por Wrangler
│   ├── assets/                  # Logo y favicon
│   ├── css/styles.css           # Estilos globales y componentes
│   ├── js/
│   │   ├── products.js          # Datos de cortes y combos (catálogo)
│   │   ├── order.js             # Carrito (localStorage + WhatsApp)
│   │   └── app.js               # Renderizado, eventos, navegación y checkout
│   └── index.html               # Página principal
├── supabase/
│   ├── migrations/              # Esquema, catálogo y órdenes
│   └── functions/               # Edge Functions de Mercado Pago
├── .env.example                 # Plantilla; nunca contiene secretos reales
├── .gitignore
├── deploy.ps1                   # Deploy seguro de migraciones + Functions + sitio
├── wrangler.jsonc               # Configuración Cloudflare Workers
└── README.md                    # Este archivo
```

---

## Características

### Catálogo
- 24 cortes de carne argentina (clásicos y premium)
- Precio por kilogramo y método de cocción visible en cada corte
- Selector de kilos con subtotal dinámico
- Búsqueda, filtro por categoría y orden por precio o nombre
- 3 combos comprables por unidad, con ahorro y kilos incluidos

### Carrito de compras
- Agregar cortes por kg y combos por unidad
- Mesa de pedidos con detalle, subtotales, total en $ y total de kg
- Persistencia en localStorage (sobrevive recargas)
- Checkout de Mercado Pago con redirección al Checkout Pro y precios validados en servidor
- Envío del pedido formateado por WhatsApp con desglose de precios

### Contenido
- Sección "Nosotros" con historia de marca
- Testimonios de clientes (4 reseñas con rating)
- FAQ interactivo (4 preguntas con acordeón)
- Guía de cortes con información de cocción, punto y tiempo
- Fotos reales de los cortes (Wikimedia Commons), verificadas contra la equivalencia anatómica de cada corte
- Sección mayoristas con contacto directo por WhatsApp

### Responsive
- Escritorio, tablet y móvil
- Menú hamburguesa en pantallas ≤720px
- Drawer de pedidos full-screen en ≤480px

---

## Logo y marca

El logo es un SVG original que representa una cinta azul con el texto **MAX Carnes Premium** y una cabeza de vaca estilizada en el centro. Se utiliza en:
- Favicon del navegador
- Logo del header
- Meta `og:image` para redes sociales

El color corporativo principal es el **rojo** (`#e0342f`) sobre fondos oscuros.

---

## Diseño visual

### Paleta de colores

| Variable | Color | Uso |
|----------|-------|-----|
| `--bg` | `#0a0908` | Fondo principal |
| `--bg-alt` | `#100d0c` | Fondo de secciones alternas |
| `--card` | `#171310` | Fondo de cards |
| `--border` | `#2b2420` | Bordes y separadores |
| `--text` | `#faf6f2` | Texto principal |
| `--muted` | `#a8a29e` | Texto secundario |
| `--red` | `#e0342f` | Acento principal, botones primarios |
| `--red-dark` | `#7f1d1d` | Hover de botones |
| `--amber` | `#f59e0b` | Acento cálido, subtotales, ahorros |
| `--wa` | `#25d366` | Botones y enlaces de WhatsApp |

### Tipografía
- **Titulares y logo:** Oswald (Google Fonts) — pesos 500, 600, 700
- **Cuerpo:** system-ui stack (Segoe UI, Roboto, Safari)
- **Jerarquía:** peso 700 para h1, 600 para h2/h3, 700 para eyebrow

---

## Arquitectura frontend

### Flujo de datos

```
┌───────────────┐     ┌──────────────┐     ┌────────────────┐
│  products.js  │────▶│  app.js      │────▶│  Renderizado   │
│  (catálogo)   │     │  (control)   │     │  HTML/DOM      │
└───────────────┘     └──────┬───────┘     └────────────────┘
                             │
                     ┌───────▼───────┐
                     │  order.js     │
                     │  (carrito)    │
                     └───────┬───────┘
                             │
                     ┌───────▼───────┐
                     │ localStorage  │
                     └───────────────┘
```

### Archivos JS

**`public/js/products.js`**
- `CORTES[]` — array de 24 cortes con: id, nombre, categoría, precio, descripción, meta de cocción
- `COMBOS[]` — array de 3 combos con: id, icono, nombre, detalle, precio, precio regular y kilos incluidos

**`public/js/order.js`**
- Funciones del carrito: cortes por kg (`addToPedido`, `changeQty`) y combos por unidad (`addComboToPedido`, `changeComboQty`)
- `totalKg`, `totalPrice` e `itemCount` — totales mezclando cortes y combos
- `buildWhatsAppMessage()` — construye mensaje formateado con ítems, precios y totales
- `sendOrderByWhatsApp()` — abre wa.me con el mensaje
- Persistencia en `localStorage` con clave `max_pedido_v2` (migra automáticamente desde `max_pedido_v1`)

**`public/js/app.js`**
- `renderCortes()` — genera cards de cortes con precios, búsqueda, filtros y orden por precio/nombre
- `renderCombos()` — genera combos comprables por unidad, con precio regular, ahorro y kilos incluidos
- `renderGuia()` — tarjetas guía de cocción
- `renderDrawer()` — actualiza el panel lateral del pedido
- Event delegation para todas las interacciones (búsqueda, filtros, carrito, navegación)
- IntersectionObserver para animaciones de entrada
- Manejador del menú hamburguesa

### Patrón de renderizado

Las cards se generan con `document.createElement` + `innerHTML` mediante plantillas literales. Se usa delegación de eventos en `document` para todos los clics (`data-action`).

---

## Base de datos (Supabase)

### Esquema

La migración `supabase/migrations/20260909000100_create_meat_store_schema.sql` define:

| Tabla | Descripción |
|-------|-------------|
| `products` | Cortes de carne con SKU, precio/kg, modo de venta, stock en gramos |
| `boxes` | Cajas recurrentes (Kit Asado, Kit Semanal) con periodicidad y precio |
| `box_items` | Productos incluidos en cada caja (relación N:N) |
| `subscriptions` | Suscripción de usuario autenticado a una caja |
| `recipes` | Recetas/guías de cocina con método y tiempo |
| `recipe_products` | Relación receta ↔ corte (N:N con cantidad) |

### Imágenes de los cortes

La columna `products.image_url` se alimenta con la migración `20260925020000_product_imagenes.sql` (idempotente, update por `slug`).

- **Verificación previa:** cada foto fue elegida contrastando la equivalencia anatómica del corte argentino con su equivalente NAMP (p. ej. Vacío = Flank, Bola de Lomo = Knuckle/Sirloin Tip, Cuadrada = Outside Flat, Cuadril = Top Sirloin, Colita de Cuadril = Tri-Tip, Peceto = Eye Round, Lomo = Tenderloin, Pecho = Brisket).
- **Hotlink:** se usan thumbnails **960px** de `thumb.wikimedia.org` (los tamaños estándar que permite Wikimedia para hotlinking; tamaños arbitrarios son rechazados).
- **Atribución:** las imágenes tienen licencias libres (CC BY / CC BY-SA / GFDL) que **requieren atribución**. Si se reembeben en otro medio, debe mantenerse el crédito (ver las páginas de cada archivo en Commons).
- **Placeholders:** **Peceto** y **Mocho** quedan intencionalmente sin imagen porque no existe en Commons una foto exacta y confiable (eye round / cogote); se prefiere el placeholder antes que mostrar un corte incorrecto. Cuando el administrador tenga fotos propias, puede cargarlas desde el panel y el frontend las mostrará automáticamente.
- El frontend usa la imagen si `image_url` viene del servidor; el catálogo local de respaldo (`public/js/products.js`) tiene las mismas URLs.

### Políticas RLS

- Productos activos: lectura pública
- Cajas activas: lectura pública
- Suscripciones: propietario autenticado (CRUD completo)
- Recetas publicadas: lectura pública
- Todo lo demás: acceso vía `service_role` (server-side)

### Funciones utilitarias

- `set_updated_at()` — trigger que actualiza `updated_at` en UTC

---

## Instalación local

### Solo frontend (sin backend)

Abrir `public/index.html` directamente en un navegador, o servir con un servidor HTTP local:

```bash
# Python, publicando únicamente el frontend
python -m http.server 8000 --directory public

# Luego abrir http://localhost:8000
```

### Con Supabase

```bash
# Requiere Supabase CLI
supabase start
supabase db reset
```

### Conectar el catálogo al proyecto remoto

El frontend consulta Supabase y usa el catálogo local como respaldo si no hay datos. Para activar el catálogo en vivo:

1. Abrir [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto → **SQL Editor**
2. Ejecutar las migraciones en orden:
   - `supabase/migrations/20260909000100_create_meat_store_schema.sql` (tablas base + RLS)
   - `supabase/migrations/20260910001000_connect_frontend_catalog.sql` (columnas, tabla `combos` y semilla de 24 cortes + 3 combos)
   - `supabase/migrations/20260912000000_add_orders_payments.sql` (órdenes, ítems y pagos)
   - `supabase/migrations/20260925000000_combos_comprables.sql` (kilos de combos y snapshot para checkout)
   - `supabase/migrations/20260925010000_payment_audit_fields.sql` (auditoría de pagos y `paid_at`)
3. Recargar la página → debería mostrarse **"Catálogo en vivo desde Supabase"**

> La **publishable key** de Supabase es pública por diseño y se configura en `public/js/config.js` (el deploy puede inyectarla desde `.env`). El checkout usa Checkout Pro alojado: no hay una public key de Mercado Pago en el frontend. La `service_role` key y el `MP_ACCESS_TOKEN` **nunca** deben ir al frontend ni al repo.

### Cloudflare Workers

```bash
# Desarrollo local con el mismo runtime de Cloudflare
npx wrangler dev

# Deploy seguro: aplica migraciones, publica Functions y sitio
.\deploy.ps1
```

---

## Funcionamiento del pedido

1. El usuario navega la sección **Cortes** o **Combos**.
2. Selecciona kilos para cortes o unidades para combos.
3. Hace clic en **Agregar** → el producto se suma al carrito.
4. El badge del header muestra la cantidad de ítems distintos.
5. El botón **Pedido** abre el drawer lateral con el detalle completo.
6. Puede **Enviar pedido por WhatsApp** o elegir **Pagá con Mercado Pago**.

```
Hola MAX Carnes! Quiero hacer un pedido:
• Vacío: 2 kg x $15.990 = $31.980
• Lomo: 1 kg x $22.990 = $22.990

Kilos totales: 3 kg
Total estimado: $54.970
```

7. El carrito se persiste en `localStorage` → no se pierde al recargar.

### Checkout de Mercado Pago (validación server-side)

- El navegador **nunca confirma un pago**: sólo muestra un mensaje de verificación y conserva el carrito al volver de Checkout Pro (`#/ok`, `#/pending`, `#/error`).
- Un marcador local evita abrir una segunda Preference para el mismo pedido y se libera al cambiar el carrito o volver con error.
- La **Edge Function `create-mp-preference`** valida en el servidor: slugs/cantidades, límites por línea, precios leídos de Supabase, mode de venta por kg, `min_weight_grams`/`max_weight_grams`, `stock_grams`, total, origen CORS y rate limit. La orden y su snapshot se persisten antes de crear la Preference.
- La **Edge Function `mp-webhook`** reconsulta el pago real en la API de Mercado Pago, valida referencia, importe, moneda, Preference, ambiente y firma (`MP_WEBHOOK_SECRET`), y recién entonces marca la orden `pending → paid` con transición condicional (no degrada `paid`/`refunded` con eventos viejos).

### Estado operativo (antes de producción)

- `stock_grams` es un **snapshot de disponibilidad**, no una reserva: valida en el momento del checkout pero no descuenta inventario. El descuento/reserva se resuelve en el flujo operativo o con la futura reserva transaccional del panel admin.
- Los combos controlan "disponibilidad" con `is_active`; hoy no tienen BOM/inventario propio.
- `MP_WEBHOOK_SECRET` es opcional pero **recomendado** para enviar la firma verificada.
- La migración `20260910001000_connect_frontend_catalog.sql` fue editada para volver la siembra idempotente y no destructiva. Si el proyecto remoto ya la aplicó con el checksum anterior, ejecutar `npx supabase migration list` antes de `db push`; si salta "Remote migration mismatch", usar `npx supabase migration repair` o aplicar el SQL nuevo a mano (ver `DEPLOY.md`).

---

## Accesibilidad

| Elemento | Implementación |
|----------|---------------|
| Navegación | Skip link "Saltar al contenido" |
| Formularios | `<label>` oculto para búsqueda |
| Región dinámica | `aria-live="polite"` en contador de pedidos y drawer |
| Modal/Drawer | `aria-hidden` alternado al abrir/cerrar |
| Controles | `aria-label`, `aria-controls` en botones de cantidad |
| Menú | `aria-expanded`, `aria-controls` en hamburger |
| Imágenes | `alt="MAX Carnes Premium"` en logo |
| Navegación por teclado | Escape cierra drawer, tab natural |

---

## Próximos pasos

1. **Auth completo** — login, registro, perfil y recuperación de contraseña
2. **Panel de administración** — gestión de productos, combos, órdenes y stock
3. **Imágenes reales** — fotos fidelity-correctas de cada corte
4. **Tracking de envíos** — estado del pedido en tiempo real
5. **Notificaciones** — confirmación de pago y entrega
6. **Historial del cliente** — consultas y pedidos desde la cuenta

---

## Despliegue

> **Todo en un comando.** Copiá `deploy.ps1` a la raíz del repo, poné las claves reales en `.env` (nunca se sube a git) y ejecutá `.\deploy.ps1`. Guía completa en [`DEPLOY.md`](DEPLOY.md).

```powershell
# 1) Configurá .env con las claves reales (MP_ACCESS_TOKEN, etc.)
Copy-Item .env.example .env -Force
# 2) Un solo comando aplica migraciones y despliega Functions + sitio
.\deploy.ps1
```

El script **aborta si detecta placeholders** (`TU_ACCESS_TOKEN_MP`, etc.) para no publicar un checkout roto.

---

## Cambios recientes

### v1.0 — Frontend Overhaul (Septiembre 2026)
- Logo SVG personalizado (cinta azul + vaca + marca)
- Tipografía Oswald para titulares y brand identity
- Paleta cálida mejorada (ámbar + rojo + oscuro)
- Precios visibles en todos los cortes y combos
- Subtotales dinámicos en cards y drawer
- Menú hamburguesa responsive
- Animaciones de entrada (fade-up con stagger)
- Sección testimonios (4 reseñas)
- FAQ interactivo (4 acordeones)
- Banner de envío sin cargo
- Hero con estadísticas de marca
- Mejoras de accesibilidad (ARIA, skip link, labels)
- Fix de precisión decimal en totales
- WhatsApp con desglose de precios por línea

### v0.1 — Setup inicial
- Landing page estática con catálogo hardcodeado
- Sistema de carrito con localStorage
- Integración WhatsApp para pedidos
- Migración Supabase para backend

---

## Licencia

© 2026 MAX Carnes Premium. Todos los derechos reservados.
