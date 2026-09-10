# MAX Carnes Premium 🥩

Tienda online de carnes premium argentinas. Emprendimiento familiar con cortes de calidad, combos recomendados y pedido directo por WhatsApp.

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

MAX Carnes Premium es un sitio web estático para la venta directa de carnes argentinas. El usuario navega el catálogo de cortes, selecciona cantidades en kilos, arma su pedido y lo envía por WhatsApp. La tienda también ofrece combos recomendados, una guía de cocción, testimonios de clientes y sección de preguntas frecuentes.

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
| Comunicación | WhatsApp Business API (wa.me deep links) |

---

## Estructura del proyecto

```
max/
├── assets/
│   ├── logo.svg          # Logo principal (cinta azul + vaca)
│   └── favicon.svg       # Favicon alternativo
├── css/
│   └── styles.css        # Estilos globales y componentes
├── js/
│   ├── products.js       # Datos de cortes y combos (catálogo)
│   ├── order.js          # Lógica del carrito (localStorage + WhatsApp)
│   └── app.js            # Renderizado, eventos, navegación, animaciones
├── supabase/
│   └── migrations/
│       └── 20260909000100_create_meat_store_schema.sql  # Esquema DB
├── .gitignore
├── .assetsignore
├── wrangler.jsonc        # Configuración Cloudflare Workers
├── index.html            # Página principal
├── README.md             # Este archivo
└── claude/
    └── settings.json     # Configuración local Claude (excluido de git)
```

---

## Características

### Catálogo
- 23 cortes de carne argentina (clásicos y premium)
- Precio por kilogramo visible en cada corte
- Selector de kilos con subtotal dinámico
- Búsqueda por nombre y filtro por categoría (Clásicos / Premium)
- 3 combos recomendados con ahorro porcentual

### Carrito de compras
- Agregar cortes con cantidad en kg
- Mesa de pedidos con detalle (precio/kg, subtotal por ítem, total en $ y kg)
- Persistencia en localStorage (sobrevive recargas)
- Envío del pedido formateado por WhatsApp con desglose de precios

### Contenido
- Sección "Nosotros" con historia de marca
- Testimonios de clientes (4 reseñas con rating)
- FAQ interactivo (4 preguntas con acordeón)
- Guía de cortes con información de cocción, punto y tiempo
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

**`js/products.js`**
- `CORTES[]` — array de 23 cortes con: id, nombre, categoría, precio, descripción, meta de cocción
- `COMBOS[]` — array de 3 combos con: id, icono, nombre, detalle, precio, precio regular

**`js/order.js`**
- Funciones del carrito: `addToPedido`, `changeQty`, `removeFromPedido`, `totalKg`, `totalPrice`, `itemCount`
- `buildWhatsAppMessage()` — construye mensaje formateado con ítems, precios y totales
- `sendOrderByWhatsApp()` — abre wa.me con el mensaje
- Persistencia en `localStorage` con clave `max_pedido_v1`

**`js/app.js`**
- `renderCortes()` — genera cards de cortes con precios, filtros y búsqueda
- `renderCombos()` — genera cards de combos con precios y ahorro
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

Abrir `index.html` directamente en un navegador, o servir con un servidor HTTP local:

```bash
# Python
python -m http.server 8000

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
3. Recargar la página → debería mostrarse **"Catálogo en vivo desde Supabase"**

> Las credenciales van en `js/config.js`. La **publishable key** es pública por diseño (RLS protege los datos). La `service_role` key **nunca** debe ir al frontend ni al repo.

## Imágenes de los cortes

Las fotos en `assets/img/cortes/` provienen de [Wikimedia Commons](https://commons.wikimedia.org) y se usan bajo sus licencias (mayormente CC BY-SA). Pueden reemplazarse por fotos propias actualizando la columna `image_url` (o el campo `img` en `js/products.js` como respaldo).

Fuentes por corte:
- **Vacío / Taco de vacío**: [Vacío (corte argentino de carne) con sal gruesa al horno](https://commons.wikimedia.org/wiki/File:Vac%C3%ADo_(corte_argentino_de_carne)_con_sal_gruesa_al_horno.jpg)
- **Tapa de asado / Paleta**: [Raw Beef Short Ribs Slices](https://commons.wikimedia.org/wiki/File:Raw_Beef_Short_Ribs_Slices.jpg)
- **Matambre**: [Matambre1](https://commons.wikimedia.org/wiki/File:Matambre1.jpg)
- **Entraña**: [Skirt steak](https://commons.wikimedia.org/wiki/File:Skirt_steak_1_2015-02-15.JPG)
- **Lomo / Bola de lomo / Mocho**: [Beef tenderloin](https://commons.wikimedia.org/wiki/File:Beef_tenderloin.jpg)
- **Cuadril / Peceto**: [Rump steak](https://commons.wikimedia.org/wiki/File:Rump_steak.jpg)
- **Cuadrada / Bife c/ Lomo**: [Raw Beef Ribeye Slices for Hot Pot](https://commons.wikimedia.org/wiki/File:Raw_Beef_Ribeye_Slices_for_Hot_Pot.jpg)
- **Colita / Picaña**: [Picanha](https://commons.wikimedia.org/wiki/File:Picanha.jpg)
- **Bifes**: [Bife de chorizo](https://commons.wikimedia.org/wiki/File:Bife_de_chorizo.jpg)
- **Nalga / Roast beef**: [Beef round top round steak in pan](https://commons.wikimedia.org/wiki/File:Beef_round_top_round_steak_in_pan,_raw.jpg)
- **Picada**: [Ground beef USDA](https://commons.wikimedia.org/wiki/File:Ground_beef_USDA.jpg)
- **Osobuco / Osobuco del Rey**: [Osobuco](https://commons.wikimedia.org/wiki/File:Osobuco_-_2010-10-20.jpg)
- **T-Bone / Tomahawk**: [Angus Organic Entrecote](https://commons.wikimedia.org/wiki/File:Angus_Organic_Entrecote.jpg)
- **Pecho**: [Brisket](https://commons.wikimedia.org/wiki/File:Brisketphoto.jpg)
- **Completo**: [Asadito](https://commons.wikimedia.org/wiki/File:Asadito.jpg)

### Cloudflare Workers

```bash
wrangler deploy
```

---

## Funcionamiento del pedido

1. El usuario navega la sección **Cortes** o **Combos**
2. Selecciona kilos con los botones **+** / **-**
3. Hace clic en **Agregar** → el corte se suma al carrito
4. El badge del header muestra la cantidad de ítems distintos
5. El botón **Pedido** abre el drawer lateral con detalle completo
6. **Enviar pedido por WhatsApp** genera un mensaje formateado:

```
Hola MAX Carnes! Quiero hacer un pedido:
• Vacío: 2 kg x $15.990 = $31.980
• Lomo: 1 kg x $22.990 = $22.990

Kilos totales: 3 kg
Total estimado: $54.970
```

7. El carrito se persiste en `localStorage` → no se pierde al recargar

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

1. **Conectar frontend a Supabase** — reemplazar datos estáticos por consultas al backend
2. **Tabla `orders` + `order_items`** — historial de pedidos y control de stock
3. **Auth completo** — login, perfil, historial de suscripciones
4. **Imágenes reales** — fotos de cada corte para reemplazar el placeholder
5. **Pasarela de pago** — integración con Stripe, MercadoPago o similar
6. **Panel de administración** — gestión de productos, cajas y recetas
7. **Tracking de envíos** — estado del pedido en tiempo real
8. **Notificaciones push** — confirmación de entrega

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
