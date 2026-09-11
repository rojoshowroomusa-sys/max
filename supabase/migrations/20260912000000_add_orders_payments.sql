-- Persistencia de pedidos pagados con Mercado Pago.
-- Las órdenes se crean como 'pending' cuando se genera la preferencia de pago
-- y las confirma la Edge Function mp-webhook (service role) tras validar el
-- pago contra la API de Mercado Pago. Nadie marca un pago como pagado desde el
-- frontend/cliente: el cliente NO puede escribir en estas tablas (RLS sin policy).

-- 1) Órdenes de compra
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  mp_preference_id text unique,
  external_reference text unique,
  total numeric(12, 2) not null check (total >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded')),
  customer_phone text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index orders_preference_idx on public.orders (mp_preference_id);

-- 2) Ítems de cada orden (snapshot del corte en el momento de la compra)
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_slug text not null,
  product_name text not null,
  qty_kg numeric(12, 3) not null check (qty_kg > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0)
);

create index order_items_order_idx on public.order_items (order_id);

-- 3) Pagos de Mercado Pago vinculados a una orden
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  mp_payment_id text unique,
  status text,
  status_detail text,
  payment_method text,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index payments_order_idx on public.payments (order_id);
create index payments_mp_payment_idx on public.payments (mp_payment_id);

-- RLS: se habilita en todas. NO se crean políticas de acceso público:
-- solo el service role (Edge Functions) puede leer/escribir.
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;