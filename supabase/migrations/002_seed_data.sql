-- =====================================================
-- MIGRACIÓN 02: Datos de seed para MAX Carnes Premium
-- Ejecutar DESPUÉS de 001_schema_base.sql
-- =====================================================

-- =====================================================
-- PRODUCTOS: 23 cortes argentinos
-- =====================================================
insert into public.products (sku, name, slug, description, sale_mode, price_per_kg, min_weight_grams, max_weight_grams, stock_grams, vacuum_packed, is_active, categoria, meta) values
  ('VACIO-001',   'Vacío',            'vacio',            'Corte tierno y jugoso, ideal para la parrilla. Con su característica capa de grasa que le da un sabor inigualable.', 'estimated_weight', 15990, 500, 3000, 5000, false, true, 'clasicos', '{"coccion": "Parrilla", "punto": "Jugoso (a punto)", "tiempo": "15-20 min"}'),
  ('TAPA-001',    'Tapa de Asado',    'tapa-asado',       'La tapa del asado de tira, con esa grasa que al derretirse sobre las brasas da un sabor único.', 'estimated_weight', 12990, 500, 3000, 5000, false, true, 'clasicos', '{"coccion": "Parrilla lenta", "punto": "Bien cocido", "tiempo": "40-60 min"}'),
  ('MATAMBRE-001','Matambre',         'matambre',         'Corte fino y versátil. Ideal arrollado o a la parrilla. Relleno de verduras y huevo es un clásico.', 'estimated_weight', 13990, 500, 2500, 4000, false, true, 'clasicos', '{"coccion": "Parrilla", "punto": "Cocido completo", "tiempo": "25-35 min"}'),
  ('ENTRANA-001','Entraña',           'entrana',          'Corte delgado y muy sabroso. Se cocina rápido y queda crocante por fuera, jugosa por dentro. Imperdible.', 'estimated_weight', 14990, 300, 2000, 3000, false, true, 'clasicos', '{"coccion": "Parrilla muy caliente", "punto": "Jugosa", "tiempo": "6-10 min"}'),
  ('LOMO-001',    'Lomo',             'lomo',             'El corte más tierno. Magro y suave, perfecto para horno o plancha. Ideal para ocasiones especiales.', 'estimated_weight', 22990, 500, 3000, 4000, false, true, 'clasicos', '{"coccion": "Horno o plancha", "punto": "Jugoso (a punto)", "tiempo": "20-30 min"}'),
  ('PECETO-001',  'Peceto',           'peceto',           'Corte magro y tierno, ideal para roast beef, milanesas o al horno con verduras.', 'estimated_weight', 17990, 500, 3000, 4000, false, true, 'clasicos', '{"coccion": "Horno", "punto": "A punto", "tiempo": "50-60 min"}'),
  ('NALGA-001',   'Nalga',            'nalga',            'Magro y versátil, perfecto para milanesas, bocados o a la plancha.', 'estimated_weight', 14990, 500, 2500, 3500, false, true, 'clasicos', '{"coccion": "Plancha o sartén", "punto": "A punto", "tiempo": "8-12 min"}'),
  ('BOLA-001',    'Bola de Lomo',     'bola-lomo',        'Tierno y magro, ideal para porciones al horno o brochettes.', 'estimated_weight', 16990, 500, 2500, 3500, false, true, 'clasicos', '{"coccion": "Horno", "punto": "Jugoso (a punto)", "tiempo": "35-45 min"}'),
  ('CUADRADA-001','Cuadrada',         'cuadrada',         'Ideal para roast beef o cocción al horno. Rinde y no falla.', 'estimated_weight', 13990, 500, 3000, 4000, false, true, 'clasicos', '{"coccion": "Horno", "punto": "A punto", "tiempo": "60-70 min"}'),
  ('CUADRIL-001', 'Cuadril',          'cuadril',          'Sabor intenso y textura firme. Excelente a la parrilla o al horno.', 'estimated_weight', 18990, 500, 2500, 3500, false, true, 'clasicos', '{"coccion": "Parrilla", "punto": "Jugoso (a punto)", "tiempo": "20-25 min"}'),
  ('COLITA-001',  'Colita de Cuadril','colita-cuadril',   'El corte de los asados especiales. Tierno, jugoso y con sabor inigualable a la parrilla.', 'estimated_weight', 19990, 500, 2500, 3500, false, true, 'clasicos', '{"coccion": "Parrilla", "punto": "Jugoso (a punto)", "tiempo": "25-30 min"}'),
  ('BIFES-001',   'Bifes',            'bifes',            'Listos para la plancha o la parrilla. Prácticos y rendidores.', 'estimated_weight', 14990, 400, 2000, 3000, false, true, 'clasicos', '{"coccion": "Plancha o sartén", "punto": "A punto", "tiempo": "6-8 min"}'),
  ('ROAST-001',   'Roast Beef',       'roast-beef',       'El clásico de mesa. Ideal al horno, caliente o frío, para toda ocasión.', 'estimated_weight', 15990, 500, 3000, 4000, false, true, 'clasicos', '{"coccion": "Horno", "punto": "A punto", "tiempo": "60-75 min"}'),
  ('PALETA-001',  'Paleta',           'paleta',           'Versátil y económica. Ideal al horno, estofada o a la parrilla.', 'estimated_weight', 10990, 500, 3000, 5000, false, true, 'clasicos', '{"coccion": "Horno o estofado", "punto": "Bien cocido", "tiempo": "90-120 min"}'),
  ('PICADA-001',  'Picada',           'picada',           'Cortes chicos listos para la picada o para saltear. Rinde y gusta.', 'estimated_weight', 12990, 300, 1500, 2000, false, true, 'clasicos', '{"coccion": "Sartén", "punto": "Cocido", "tiempo": "5-8 min"}'),
  ('OSOBUCO-001', 'Osobuco',          'osobuco',          'Corte con hueso y médula. Ideal para guisos y estofados de cocción lenta.', 'estimated_weight', 11990, 500, 3000, 4000, false, true, 'clasicos', '{"coccion": "Estofado", "punto": "Muy tierno", "tiempo": "120-150 min"}'),
  ('TBONE-001',   'T-Bone',           't-bone',           'Dos cortes en uno: lomo y bife separados por su hueso en T. La experiencia premium de la parrilla.', 'estimated_weight', 26990, 600, 3500, 4000, false, true, 'premium', '{"coccion": "Parrilla alta", "punto": "Jugoso (a punto)", "tiempo": "15-20 min"}'),
  ('TOMAHAWK-001','Tomahawk',         'tomahawk',         'El corte más imponente. Bife de chorizo con hueso largo, ideal para reverse sear y sorprender a todos.', 'estimated_weight', 28990, 800, 5000, 6000, false, true, 'premium', '{"coccion": "Reverse sear", "punto": "Jugoso (a punto)", "tiempo": "30-40 min"}'),
  ('PICAÑA-001',  'Picaña',           'picana',           'La joya brasileña. Su capa de grasa la hace jugosa, con un sabor intenso e inconfundible.', 'estimated_weight', 21990, 500, 3000, 4000, false, true, 'premium', '{"coccion": "Parrilla", "punto": "Jugosa", "tiempo": "20-25 min"}'),
  ('OSOBUCO-REY-001','Osobuco del Rey','osobuco-rey',     'Nuestro osobuco premium, seleccionado especialmente para preparaciones de autor.', 'estimated_weight', 16990, 500, 3000, 4000, false, true, 'premium', '{"coccion": "Cocción lenta", "punto": "Muy tierno", "tiempo": "120-150 min"}'),
  ('PECHO-001',   'Pecho',            'pecho',            'Con marmoleado natural, ideal para cocciones lentas que se deshacen en la boca.', 'estimated_weight', 13990, 500, 3000, 4000, false, true, 'premium', '{"coccion": "Cocción lenta", "punto": "Muy tierno", "tiempo": "180-240 min"}'),
  ('MOCHO-001',   'Mocho',            'mocho',            'Tierno y sabroso, ideal para estofados que caen solos del tenedor.', 'estimated_weight', 15990, 500, 3000, 4000, false, true, 'premium', '{"coccion": "Estofado", "punto": "Muy tierno", "tiempo": "90-120 min"}'),
  ('COMPLETO-001','Completo',         'completo',         'Asado, vacío, matambre y entraña. La parrillada completa lista para el fuego.', 'estimated_weight', 14990, 800, 5000, 6000, false, true, 'premium', '{"coccion": "Parrilla", "punto": "Según corte", "tiempo": "40-60 min"}'),
  ('BIFE-MEDIA-001','Bife c/ Lomo — Media Res','bife-lomo-media-res','Media res de bife con lomo, lista para tu evento o reunión grande.', 'estimated_weight', 17990, 800, 5000, 6000, false, true, 'premium', '{"coccion": "Parrilla", "punto": "A punto", "tiempo": "25-35 min"}');

-- =====================================================
-- COMBOS: 3 combos recomendados
-- =====================================================
insert into public.combos (slug, name, icon, description, price, regular_price, is_active) values
  ('combo-asado',   'Combo Asado para 4',   '🔥', '2kg de tapa de asado + 1kg de vacío + 1kg de entraña', 49990, 54990, true),
  ('combo-parrillada', 'Combo Parrillada para 6', '🥩', '2kg de tapa de asado + 2kg de vacío + 1kg de matambre + 1kg de entraña', 74990, 82990, true),
  ('combo-premium', 'Combo Premium para 2', '⭐', '1kg de lomo + 1kg de picaña', 44990, 49990, true);

-- =====================================================
-- BOXES: Suscripciones recurrentes (opcional)
-- =====================================================
insert into public.boxes (name, slug, description, periodicity, price, is_active) values
  ('Kit Asado Clásico', 'kit-asado-clasico', 'Tapa de asado + vacío + entraña. Para 4 personas.', 'weekly', 49990, true),
  ('Kit Semanal Premium', 'kit-semanal-premium', 'Lomo + picaña + tomahawk + matambre. Para 2 personas.', 'weekly', 79990, true);

-- =====================================================
-- BOX_ITEMS: Relación cajas ↔ productos
-- =====================================================
insert into public.box_items (box_id, product_id, quantity, quantity_unit)
  select b.id, p.id, 1, 'kg'
  from public.boxes b, public.products p
  where b.slug = 'kit-asado-clasico' and p.slug in ('tapa-asado', 'vacio', 'entrana');

insert into public.box_items (box_id, product_id, quantity, quantity_unit)
  select b.id, p.id, 1, 'kg'
  from public.boxes b, public.products p
  where b.slug = 'kit-semanal-premium' and p.slug in ('lomo', 'picana', 'tomahawk', 'matambre');

-- =====================================================
-- RECETAS: Guías de cocción
-- =====================================================
insert into public.recipes (title, slug, summary, instructions, marinade, cooking_method, cooking_time_minutes, published) values
  ('Asado Perfecto de Tira', 'asado-perfecto-tira', 'Guía completa para un asado de tira impecable.', '1. Prender el fuego con carbono de leña 40 min antes. 2. Salar los cortes 15 min previos. 3. Cocinar a fuego lento 40-60 min, dándole vuelta cada 10 min. 4. Servir en platos calientes.', 'Sal gruesa, ajo entero, chimichurri', 'Parrilla lenta', 60, true),
  ('Lomo a Punto', 'lomo-a-punto', 'El lomo es el corte más tierno. Cocción rápida.', '1. Sacar el lomo 30 min antes de cocinar. 2. Salar generosamente. 3. Cocinar en plancha muy caliente 4-5 min por lado para punto jugoso. 4. Dejar reposar 5 min antes de servir.', 'Sal, pimienta, aceite de oliva', 'Plancha', 10, true),
  ('Vacío a la Parrilla', 'vacio-a-parrilla', 'El clásico argentino por excelencia.', '1. El vacío se cocina con la grasa hacia abajo. 2. Fuego medio-alto. 3. 15-20 min por lado. 4. Dejar reposar 10 min antes de cortar.', 'Sal gruesa, romero', 'Parrilla', 20, true),
  ('Tomahawk Reverse Sear', 'tomahawk-reverse-sear', 'Técnica premium para el Tomahawk.', '1. Cocinar a fuego bajo en horno a 120°C por 30-40 min. 2. Sacar, salar generosamente. 3. Sellar en parrilla muy caliente 2 min por lado. 4. Reposar 10 min.', 'Sal gruesa, ajo en polvo', 'Reverse sear', 40, true);

-- =====================================================
-- RECIPE_PRODUCTS: Relación recetas ↔ productos
-- =====================================================
insert into public.recipe_products (recipe_id, product_id, is_primary, quantity, quantity_unit)
  select r.id, p.id, true, 2, 'kg'
  from public.recipes r, public.products p
  where r.slug = 'asado-perfecto-tira' and p.slug = 'tapa-asado';

insert into public.recipe_products (recipe_id, product_id, is_primary, quantity, quantity_unit)
  select r.id, p.id, false, 1, 'kg'
  from public.recipes r, public.products p
  where r.slug = 'asado-perfecto-tira' and p.slug = 'vacio';

insert into public.recipe_products (recipe_id, product_id, is_primary, quantity, quantity_unit)
  select r.id, p.id, false, 1, 'kg'
  from public.recipes r, public.products p
  where r.slug = 'asado-perfecto-tira' and p.slug = 'entrana';

insert into public.recipe_products (recipe_id, product_id, is_primary, quantity, quantity_unit)
  select r.id, p.id, true, 1, 'kg'
  from public.recipes r, public.products p
  where r.slug = 'lomo-a-punto' and p.slug = 'lomo';

insert into public.recipe_products (recipe_id, product_id, is_primary, quantity, quantity_unit)
  select r.id, p.id, true, 1, 'kg'
  from public.recipes r, public.products p
  where r.slug = 'vacio-a-parrilla' and p.slug = 'vacio';

insert into public.recipe_products (recipe_id, product_id, is_primary, quantity, quantity_unit)
  select r.id, p.id, true, 1, 'kg'
  from public.recipes r, public.products p
  where r.slug = 'tomahawk-reverse-sear' and p.slug = 'tomahawk';

-- =====================================================
-- FUNCIONES ÚTILES (RLS helpers)
-- =====================================================
create or replace function public.is_admin() returns boolean as $$
begin
  return false; -- Solo service_role puede escribir en orders/payments
end;
$$ language plpgsql security definer;

-- =====================================================
-- ÍNDICES DE BÚSQUEDA DE TEXTO
-- =====================================================
-- Ya creado en la migración anterior, pero asegurar que funcione:
create index if not exists idx_products_search ON public.products USING gin(to_tsvector('spanish', name || ' ' || coalesce(description, '')));
