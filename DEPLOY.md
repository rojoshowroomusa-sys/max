# 🚀 Deploy de MAX Carnes Premium

Todo se publica con **un solo comando**:

```powershell
.\deploy.ps1
```

El script hace, en orden:
1. **Migraciones de Supabase** (incluye el esquema de combos comprables).
2. **Supabase Edge Functions** (`create-mp-preference` y `mp-webhook`) + sus secrets.
3. **Sitio estático** a Cloudflare Workers con `wrangler`.

Las claves públicas se inyectan solo en la copia que se publica; `public/js/config.js` se restaura al final, incluso si el deploy falla. Wrangler publica únicamente el directorio `public/`, por lo que `.env`, código de Supabase y documentación interna quedan fuera por diseño.

**Importante:** si hay placeholders sin resolver en `.env`, el script **aborta antes de subir nada** (nunca despliega un `TU_ACCESS_TOKEN_MP`).

---

## 1) Necesitás (una sola vez, desde tu cuenta)

| Cuenta | Qué crear/dónde | Lo que sale de ahí |
|--------|-----------------|--------------------|
| **Supabase** (proyecto ya creado) | Dashboard → *Settings → API / Database* | `SUPABASE_PUBLISHABLE_KEY` (frontend), `SUPABASE_DB_PASSWORD` (migraciones) |
| **Mercado Pago** | [Panel](https://www.mercadopago.com.ar/developers) → *Credenciales* | `MP_ACCESS_TOKEN` |
| **MP Webhook** (opcional) | En la preferencia, para validar firma | `MP_WEBHOOK_SECRET` |
| **Cloudflare** | `wrangler login` (una vez por máquina) | — |

> El `MP_ACCESS_TOKEN` es **secreto (server-side)**: se guarda como secret de las Edge Functions vía `.env`, nunca se sube al repo ni al frontend. El checkout es **Checkout Pro alojado**, así que no hace falta ninguna clave de Mercado Pago en el navegador; lo único público en el frontend es la `SUPABASE_PUBLISHABLE_KEY`.

---

## 2) Configurá `.env`

Copiá la plantilla y completá con valores **reales**:

```powershell
Copy-Item .env.example .env -Force
```

```
# --- Supabase ---
SUPABASE_PROJECT_REF=<ref del proyecto, ej: dezoakblk...>
SUPABASE_PUBLISHABLE_KEY=<sb_publishable_...>
SUPABASE_DB_PASSWORD=<password de la base de datos>

# --- Mercado Pago ---
MP_ACCESS_TOKEN=<Access Token MP, EMPIEZA CON TEST- en sandbox>
MP_WEBHOOK_SECRET=           # opcional

# --- Cloudflare ---
CORS_ALLOWED_ORIGIN=https://<tu-dominio>.workers.dev   # dominio final del sitio
```

Cambios de `.env` se aplican con solo **volver a correr** `.\deploy.ps1` (idempotente).

---

## 3) Desplegar

```powershell
.\deploy.ps1
```

Opciones:

```powershell
# Solo migraciones y Edge Functions (sin tocar el sitio):
.\deploy.ps1 -SkipWrangler

# Solo actualizar el sitio, si migraciones y Functions ya están aplicadas:
.\deploy.ps1 -SkipMigrations -SkipFunctions
```

---

## 3.5) Antes de desplegar — checklist

1. **Stock real en `products.stock_grams`** (gramos disponibles por corte). El checkout server-side rechaza cortes con `stock_grams` menor al pedido.
2. **Pesos mín/máx consistentes** (`min_weight_grams`/`max_weight_grams`) para cada corte vendido por kg.
3. **Combos activos** (`is_active = true`) y con `total_kg` cargado (Asado 4, Parrillada 6, Premium 2).
4. **Estado de migraciones**: correr `npx supabase migration list` para confirmar que `20260910001000_connect_frontend_catalog.sql` (revisada: siembra idempotente, no destructiva) coincide con el checksum remoto. Si hay *Remote migration mismatch*, usar `npx supabase migration repair` y volver a intentar.
5. `MP_WEBHOOK_SECRET` cargado (recomendado) para validar la firma del webhook en producción.

---

## 4) Probar el pago

1. Abrí el sitio en el dominio de `.env`.
2. Armá un pedido con un corte, un combo o ambos → **Pagá con Mercado Pago** → se abre el Checkout Pro alojado por Mercado Pago.
3. Verificá que el total del panel y el de Mercado Pago coincidan.
4. Fijate en los dos puntos:
   - El webhook `mp-webhook` registra el pago en la tabla `payments`.
   - La orden pasa de `status: pending` → `paid` en `orders` sólo después de verificar el pago en la API y su importe.

> **Flujo de prueba completo (sandbox):** crear 1 corte (ej. Vacío 1,5 kg) + 1 combo (ej. Asado x2) → preferencia en Mercado Pago con `sandbox_init_point` → pagar con tarjeta de prueba → confirmar en Supabase: `orders.status = paid`, `orders.paid_at` seteado una sola vez, `payments` con `mp_payment_id`, `amount`, `currency_id`.

> El navegador redirige al **Checkout Pro alojado** de Mercado Pago; no se monta un Brick ni se envían datos de tarjeta a nuestros servidores. Al volver, la interfaz muestra "pago en verificación" y conserva el carrito hasta que exista confirmación server-side.
>
> El webhook siempre reconsulta el pago en la API de Mercado Pago y valida referencia, importe y moneda. Si `MP_WEBHOOK_SECRET` está configurado, también valida la firma; en producción se recomienda configurarlo.
>
> **⚠️ Estado crítico:** el `MP_ACCESS_TOKEN` debe ser el real. Las credenciales de prueba y las de producción se procesan en su ambiente correspondiente; nunca se debe marcar `paid` desde el navegador.
