-- Tienda de accesorios: productos de precio cerrado por unidad, integrados al
-- carrito y al checkout de Mercado Pago (mismo camino que los combos).
--
-- Tabla propia y no `products`, a proposito:
--   1) `products` solo tiene `price_per_kg`. Un accesorio no se vende por kilo,
--      y guardar su precio ahi hace que cualquier reporte lo lea como $/kg.
--   2) El frontend ya tiene un camino de venta por unidad probado y aislado
--      (combos -> `qty_units` en order_items). Un accesorio es ese mismo caso.
--
-- Idempotente: se puede correr mas de una vez.
--
-- NO se siembran productos: el administrador los carga desde el dashboard de
-- Supabase (tabla `accesorios`). Se siembran con precio > 0, stock_units y un
-- icono; la foto es opcional y por ahora las tarjetas muestran el icono.

-- 1) Tabla de accesorios
create table if not exists public.accesorios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text,
  description text,
  price numeric(12, 2) not null check (price > 0),
  regular_price numeric(12, 2) check (regular_price is null or regular_price >= price),
  stock_units integer not null default 0 check (stock_units >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists accesorios_active_idx on public.accesorios (is_active);

drop trigger if exists accesorios_set_updated_at on public.accesorios;
create trigger accesorios_set_updated_at
before update on public.accesorios
for each row execute function public.set_updated_at();

-- 2) RLS: lectura publica de accesorios activos (mismo criterio que combos).
--    Sin policy de escritura: el cliente no carga productos, solo los lee.
alter table public.accesorios enable row level security;

drop policy if exists "Anyone can view active accessories" on public.accesorios;
create policy "Anyone can view active accessories"
on public.accesorios for select
using (is_active);

-- 3) order_items: admitir lineas de accesorio
--    a) kind admite un tercer valor
alter table public.order_items
  drop constraint if exists order_items_kind_check;

alter table public.order_items
  add constraint order_items_kind_check check (kind in ('corte', 'combo', 'accesorio'));

--    b) Forma de la linea: un accesorio siempre tiene unidades, y 0 kilos.
--       El "0 kilos" se exige aqui para que no se pueda colar un accesorio con
--       peso: si el peso no es 0, el corte tiene que auditar los gramos.
alter table public.order_items
  drop constraint if exists order_items_kind_shape_check;

alter table public.order_items
  add constraint order_items_kind_shape_check check (
    (kind = 'combo' and qty_units is not null and qty_units > 0)
    or (kind = 'accesorio' and qty_units is not null and qty_units > 0 and qty_kg = 0)
    or (kind = 'corte' and qty_units is null)
  );

--    c) qty_kg se declaro inline como `not null check (qty_kg > 0)`. Un accesorio
--       no pesa, asi que la linea tiene que poder llevar 0 kilos. El check
--       original se busca por definicion y no por nombre, asi que la migracion
--       no depende de como lo haya nombrado Postgres.
--
--       Es seguro para las filas existentes: todas son kind='corte' (default de
--       20260925000000) con qty_kg > 0, y el check nuevo solo habilita el 0
--       cuando kind='accesorio'.
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.order_items'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%qty_kg > 0%'
  loop
    execute format('alter table public.order_items drop constraint %I', c.conname);
  end loop;
end
$$;

alter table public.order_items
  add constraint order_items_qty_kg_check
  check (qty_kg > 0 or kind = 'accesorio');

-- 4) Las unidades de un accesorio son enteras, igual que las de un combo. No
--    hace falta tocar order_items_combo_units_integer_check: su definicion es
--    `kind = 'corte' or qty_units = trunc(qty_units)`, que para kind='accesorio'
--    ya exige entero.
