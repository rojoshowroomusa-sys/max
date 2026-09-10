-- Conecta el catálogo del frontend con Supabase.
-- Ejecutar en el SQL Editor del dashboard O vía `supabase db push`.
-- Es idempotente: se puede correr más de una vez.

-- 1) Columnas nuevas en products (consumidas por el frontend)
alter table public.products
  add column if not exists categoria text not null default 'clasicos',
  add column if not exists meta jsonb,
  add column if not exists image_url text;

create index if not exists products_categoria_idx on public.products (categoria);

-- 2) Tabla combos (no es una "box" recurrente: se arma a pedido)
create table if not exists public.combos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text,
  description text,
  price numeric(12, 2) not null check (price > 0),
  regular_price numeric(12, 2) check (regular_price is null or regular_price >= price),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists combos_active_idx on public.combos (is_active);

drop trigger if exists combos_set_updated_at on public.combos;
create trigger combos_set_updated_at
before update on public.combos
for each row execute function public.set_updated_at();

-- 3) RLS para combos: lectura pública de combos activos
alter table public.combos enable row level security;

create policy "Anyone can view active combos"
on public.combos for select
using (is_active);

-- 4) Si hay productos de ejemplo, borrarlos para sembrar el catálogo real
delete from public.products where sku like 'CORTE-%';
delete from public.combos;

-- 5) Semilla del catálogo: 24 cortes (slugs = ids del frontend legacy)
insert into public.products
  (sku, name, slug, description, sale_mode, price_per_kg, categoria, meta,
   min_weight_grams, max_weight_grams, stock_grams, vacuum_packed, is_active)
values
  ('CORTE-001', 'Vacío',                'vacio',             'Corte tierno y jugoso, ideal para la parrilla. Con su característica capa de grasa que le da un sabor inigualable.', 'variable_weight', 15990, 'clasicos', '{"coccion":"Parrilla","punto":"Jugoso (a punto)","tiempo":"15-20 min"}'::jsonb, 500, 10000, 25000, true, true),
  ('CORTE-002', 'Tapa de Asado',        'tapa-asado',        'La tapa del asado de tira, con esa grasa que al derretirse sobre las brasas da un sabor único.', 'variable_weight', 12990, 'clasicos', '{"coccion":"Parrilla lenta","punto":"Bien cocido","tiempo":"40-60 min"}'::jsonb, 500, 12000, 30000, true, true),
  ('CORTE-003', 'Matambre',             'matambre',          'Corte fino y versátil. Ideal arrollado o a la parrilla. Relleno de verduras y huevo es un clásico.', 'variable_weight', 13990, 'clasicos', '{"coccion":"Parrilla","punto":"Cocido completo","tiempo":"25-35 min"}'::jsonb, 500, 8000, 20000, true, true),
  ('CORTE-004', 'Entraña',              'entrana',           'Corte delgado y muy sabroso. Se cocina rápido y queda crocante por fuera, jugosa por dentro. Imperdible.', 'variable_weight', 14990, 'clasicos', '{"coccion":"Parrilla muy caliente","punto":"Jugosa","tiempo":"6-10 min"}'::jsonb, 400, 6000, 18000, true, true),
  ('CORTE-005', 'Lomo',                 'lomo',              'El corte más tierno. Magro y suave, perfecto para horno o plancha. Ideal para ocasiones especiales.', 'variable_weight', 22990, 'clasicos', '{"coccion":"Horno o plancha","punto":"Jugoso (a punto)","tiempo":"20-30 min"}'::jsonb, 500, 10000, 15000, true, true),
  ('CORTE-006', 'Peceto',               'peceto',            'Corte magro y tierno, ideal para roast beef, milanesas o al horno con verduras.', 'variable_weight', 17990, 'clasicos', '{"coccion":"Horno","punto":"A punto","tiempo":"50-60 min"}'::jsonb, 500, 10000, 16000, true, true),
  ('CORTE-007', 'Nalga',                'nalga',             'Magro y versátil, perfecto para milanesas, bocados o a la plancha.', 'variable_weight', 14990, 'clasicos', '{"coccion":"Plancha o sartén","punto":"A punto","tiempo":"8-12 min"}'::jsonb, 500, 12000, 20000, true, true),
  ('CORTE-008', 'Bola de Lomo',         'bola-lomo',         'Tierno y magro, ideal para porciones al horno o brochettes.', 'variable_weight', 16990, 'clasicos', '{"coccion":"Horno","punto":"Jugoso (a punto)","tiempo":"35-45 min"}'::jsonb, 500, 9000, 14000, true, true),
  ('CORTE-009', 'Cuadrada',             'cuadrada',          'Ideal para roast beef o cocción al horno. Rinde y no falla.', 'variable_weight', 13990, 'clasicos', '{"coccion":"Horno","punto":"A punto","tiempo":"60-70 min"}'::jsonb, 500, 12000, 17000, true, true),
  ('CORTE-010', 'Cuadril',              'cuadril',           'Sabor intenso y textura firme. Excelente a la parrilla o al horno.', 'variable_weight', 18990, 'clasicos', '{"coccion":"Parrilla","punto":"Jugoso (a punto)","tiempo":"20-25 min"}'::jsonb, 500, 9000, 14000, true, true),
  ('CORTE-011', 'Colita de Cuadril',    'colita-cuadril',    'El corte de los asados especiales. Tierno, jugoso y con sabor inigualable a la parrilla.', 'variable_weight', 19990, 'clasicos', '{"coccion":"Parrilla","punto":"Jugoso (a punto)","tiempo":"25-30 min"}'::jsonb, 400, 8000, 12000, true, true),
  ('CORTE-012', 'Bifes',                'bifes',             'Listos para la plancha o la parrilla. Prácticos y rendidores.', 'variable_weight', 14990, 'clasicos', '{"coccion":"Plancha o sartén","punto":"A punto","tiempo":"6-8 min"}'::jsonb, 500, 10000, 25000, true, true),
  ('CORTE-013', 'Roast Beef',           'roast-beef',        'El clásico de mesa. Ideal al horno, caliente o frío, para toda ocasión.', 'variable_weight', 15990, 'clasicos', '{"coccion":"Horno","punto":"A punto","tiempo":"60-75 min"}'::jsonb, 500, 12000, 13000, true, true),
  ('CORTE-014', 'Paleta',               'paleta',            'Versátil y económica. Ideal al horno, estofada o a la parrilla.', 'variable_weight', 10990, 'clasicos', '{"coccion":"Horno o estofado","punto":"Bien cocido","tiempo":"90-120 min"}'::jsonb, 500, 15000, 22000, true, true),
  ('CORTE-015', 'Picada',               'picada',            'Cortes chicos listos para la picada o para saltear. Rinde y gusta.', 'variable_weight', 12990, 'clasicos', '{"coccion":"Sartén","punto":"Cocido","tiempo":"5-8 min"}'::jsonb, 500, 8000, 20000, true, true),
  ('CORTE-016', 'Osobuco',              'osobuco',           'Corte con hueso y médula. Ideal para guisos y estofados de cocción lenta.', 'variable_weight', 11990, 'clasicos', '{"coccion":"Estofado","punto":"Muy tierno","tiempo":"120-150 min"}'::jsonb, 500, 12000, 15000, true, true),
  ('CORTE-017', 'T-Bone',               't-bone',            'Dos cortes en uno: lomo y bife separados por su hueso en T. La experiencia premium de la parrilla.', 'variable_weight', 26990, 'premium', '{"coccion":"Parrilla alta","punto":"Jugoso (a punto)","tiempo":"15-20 min"}'::jsonb, 600, 5000, 8000, true, true),
  ('CORTE-018', 'Tomahawk',             'tomahawk',          'El corte más imponente. Bife de chorizo con hueso largo, ideal para reverse sear y sorprender a todos.', 'variable_weight', 28990, 'premium', '{"coccion":"Reverse sear","punto":"Jugoso (a punto)","tiempo":"30-40 min"}'::jsonb, 800, 8000, 6000, true, true),
  ('CORTE-019', 'Picaña',               'picana',            'La joya brasileña. Su capa de grasa la hace jugosa, con un sabor intenso e inconfundible.', 'variable_weight', 21990, 'premium', '{"coccion":"Parrilla","punto":"Jugosa","tiempo":"20-25 min"}'::jsonb, 500, 10000, 10000, true, true),
  ('CORTE-020', 'Osobuco del Rey',      'osobuco-rey',       'Nuestro osobuco premium, seleccionado especialmente para preparaciones de autor.', 'variable_weight', 16990, 'premium', '{"coccion":"Cocción lenta","punto":"Muy tierno","tiempo":"120-150 min"}'::jsonb, 500, 10000, 9000, true, true),
  ('CORTE-021', 'Pecho',                'pecho',             'Con marmoleado natural, ideal para cocciones lentas que se deshacen en la boca.', 'variable_weight', 13990, 'premium', '{"coccion":"Cocción lenta","punto":"Muy tierno","tiempo":"180-240 min"}'::jsonb, 500, 15000, 11000, true, true),
  ('CORTE-022', 'Mocho',                'mocho',             'Tierno y sabroso, ideal para estofados que caen solos del tenedor.', 'variable_weight', 15990, 'premium', '{"coccion":"Estofado","punto":"Muy tierno","tiempo":"90-120 min"}'::jsonb, 500, 12000, 10000, true, true),
  ('CORTE-023', 'Completo',             'completo',          'Asado, vacío, matambre y entraña. La parrillada completa lista para el fuego.', 'variable_weight', 14990, 'premium', '{"coccion":"Parrilla","punto":"Según corte","tiempo":"40-60 min"}'::jsonb, 500, 15000, 12000, true, true),
  ('CORTE-024', 'Bife c/ Lomo — Media Res', 'bife-lomo-media-res', 'Media res de bife con lomo, lista para tu evento o reunión grande.', 'variable_weight', 17990, 'premium', '{"coccion":"Parrilla","punto":"A punto","tiempo":"25-35 min"}'::jsonb, 1000, 30000, 15000, true, true);

-- 6) Semilla de combos
insert into public.combos (name, slug, icon, description, price, regular_price, is_active)
values
  ('Combo Asado para 4',      'combo-asado',      '🔥', '2kg de tapa de asado + 1kg de vacío + 1kg de entraña',            49990, 56960, true),
  ('Combo Parrillada para 6', 'combo-parrillada', '🥩', '2kg de tapa de asado + 2kg de vacío + 1kg de matambre + 1kg de entraña', 74990, 86940, true),
  ('Combo Premium para 2',    'combo-premium',    '⭐', '1kg de lomo + 1kg de picaña',                                      39990, 44980, true);