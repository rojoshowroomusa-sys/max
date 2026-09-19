-- =====================================================
-- MIGRACIÓN 03: Catálogo corregido (24 cortes argentinos) + image_url
-- Reemplaza cortes inventados por cortes reales, corrige Picaña
-- y agrega referencia a las fotos locales.
-- Ejecutar DESPUÉS de 002_seed_data.sql. Idempotente.
-- =====================================================

alter table public.products add column if not exists image_url text;

-- 1) Osobuco del Rey (inventado) -> Ojo de Bife  [premium]
update public.products set
  sku = 'OJO-BIFE-001',
  name = 'Ojo de Bife',
  slug = 'ojo-bife',
  description = 'El ribeye argentino. Marmoleado generoso y sabor profundo, rey de la parrilla premium.',
  price_per_kg = 24990,
  min_weight_grams = 400,
  max_weight_grams = 2500,
  stock_grams = 3000,
  categoria = 'premium',
  meta = '{"coccion":"Parrilla alta","punto":"Jugoso (a punto)","tiempo":"15-20 min"}'::jsonb,
  image_url = 'assets/cortes/ojo-bife.jpg',
  is_active = true
where slug = 'osobuco-rey';

-- 2) Mocho (no es corte estándar) -> Bife de Chorizo  [premium]
update public.products set
  sku = 'BIFE-CHORIZO-001',
  name = 'Bife de Chorizo',
  slug = 'bife-chorizo',
  description = 'El corte estrella de la parrilla argentina. Firme, jugoso y con el sabor justo para no fallar nunca.',
  price_per_kg = 21990,
  min_weight_grams = 500,
  max_weight_grams = 3000,
  stock_grams = 4000,
  categoria = 'premium',
  meta = '{"coccion":"Parrilla o plancha","punto":"Jugoso (a punto)","tiempo":"12-18 min"}'::jsonb,
  image_url = 'assets/cortes/bife-chorizo.jpg',
  is_active = true
where slug = 'mocho';

-- 3) Completo (mezcla, no es corte) -> Asado de Tira  [clasicos]
update public.products set
  sku = 'ASADO-001',
  name = 'Asado de Tira',
  slug = 'asado',
  description = 'El corte nacional. Tira de asado con hueso y grasita que se derrite sobre las brasas.',
  price_per_kg = 14990,
  min_weight_grams = 500,
  max_weight_grams = 3000,
  stock_grams = 5000,
  categoria = 'clasicos',
  meta = '{"coccion":"Parrilla","punto":"A punto, bien jugoso","tiempo":"50-70 min"}'::jsonb,
  image_url = 'assets/cortes/asado.jpg',
  is_active = true
where slug = 'completo';

-- 4) Bife c/ Lomo - Media Res (formato mayorista) -> Falda  [clasicos]
update public.products set
  sku = 'FALDA-001',
  name = 'Falda',
  slug = 'falda',
  description = 'Corte con tira de grasa y sabor intenso. Ideal para cocciones lentas y guisos que se deshacen.',
  price_per_kg = 11990,
  min_weight_grams = 500,
  max_weight_grams = 3000,
  stock_grams = 4000,
  categoria = 'clasicos',
  meta = '{"coccion":"Cocción lenta","punto":"Muy tierno","tiempo":"90-120 min"}'::jsonb,
  image_url = 'assets/cortes/falda.jpg',
  is_active = true
where slug = 'bife-lomo-media-res';

-- 5) Picaña: precisión argentina (tapa de cuadril)
update public.products set
  name = 'Picaña (Tapa de Cuadril)',
  description = 'La tapa de cuadril con su capa de grasa que la hace jugosa, de sabor intenso e inconfundible.',
  image_url = 'assets/cortes/picana.jpg'
where slug = 'picana';

-- 6) Los cortes restantes: apuntar la foto local por slug
update public.products set image_url = 'assets/cortes/' || slug || '.jpg'
where image_url is null and is_active;

-- 7) Combos: ajustar detalle (name corregido de Picaña)
update public.combos set description = '1kg de lomo + 1kg de picaña (tapa de cuadril)'
where slug = 'combo-premium';