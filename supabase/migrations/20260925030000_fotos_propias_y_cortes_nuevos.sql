-- Fotos propias de los cortes (el dueño las entregó en public/images/cortes/)
-- y dos cortes nuevos: Falda y Ojo de Bife.
--
-- Idempotente: puede correrse más de una vez sin repetir filas ni pisar
-- precios/descripciones ajenos del modo que no corresponde.

-- 1) Nueve cortes nuevos en la siembra oficial. Se insertan con la misma forma
--    que 20260910001000 para que el checkout server-side los conozca.
insert into public.products
  (sku, name, slug, description, sale_mode, price_per_kg, categoria, meta,
   min_weight_grams, max_weight_grams, stock_grams, vacuum_packed, is_active)
values
  ('CORTE-025', 'Falda',        'falda',        'Corte del costillar, versátil y rendidor. Ideal para la parrilla, guisos o arrollado.', 'variable_weight', 13990, 'clasicos', '{"coccion":"Parrilla lenta","punto":"Bien cocido","tiempo":"40-60 min"}'::jsonb, 500, 10000, 15000, true, true),
  ('CORTE-026', 'Ojo de Bife',  'ojo-de-bife',  'El ribeye argentino: marmoleado, tierno y con sabor intenso. La estrella de la parrilla.', 'variable_weight', 25990, 'premium', '{"coccion":"Parrilla","punto":"Jugoso (a punto)","tiempo":"12-15 min"}'::jsonb, 600, 8000, 8000, true, true),
  ('CORTE-027', 'Tapa de Nalga','tapa-nalga',   'Pieza grande y pareja del cuarto trasero, ideal para roast beef, al horno o milanesas.', 'variable_weight', 15490, 'clasicos', '{"coccion":"Horno","punto":"Jugoso (a punto)","tiempo":"50-70 min"}'::jsonb, 800, 12000, 12000, true, true),
  ('CORTE-028', 'Aguja',        'aguja',        'Corte jugoso del cuarto delantero, con marmolado que le da sabor. Ideal para guisos, estofados o a la parrilla.', 'variable_weight', 11990, 'clasicos', '{"coccion":"Guiso o parrilla","punto":"Bien cocido","tiempo":"60-90 min"}'::jsonb, 800, 10000, 15000, true, true),
  ('CORTE-029', 'Bife Ancho',   'bife-ancho',   'El costillar con hueso: jugoso, con el sabor profundo de la grasa que lo atraviesa. Un clásico de parrilla.', 'variable_weight', 26990, 'premium', '{"coccion":"Parrilla alta","punto":"Jugoso (a punto)","tiempo":"20-25 min"}'::jsonb, 600, 8000, 8000, true, true),
  ('CORTE-030', 'Bife Angosto', 'bife-angosto', 'El bife de chorizo sin hueso: tierno, magro y con el sabor que lo hace el rey de la plancha.', 'variable_weight', 24990, 'premium', '{"coccion":"Parrilla","punto":"Jugoso (a punto)","tiempo":"10-15 min"}'::jsonb, 500, 7000, 7000, true, true),
  ('CORTE-031', 'Tira de Asado','tira-asado',   'La estrella de la parrilla argentina: hueso cortito, grasa entreverada y sabor a leña. Imposible resistirse.', 'variable_weight', 13990, 'clasicos', '{"coccion":"Parrilla","punto":"Jugosa","tiempo":"15-25 min"}'::jsonb, 1000, 8000, 10000, true, true),
  ('CORTE-032', 'Tortuguita',   'tortuguita',   'Corte chico y tierno del cuarto trasero, ideal para milanesas o a la plancha.', 'variable_weight', 13990, 'clasicos', '{"coccion":"Plancha o sartén","punto":"A punto","tiempo":"8-10 min"}'::jsonb, 500, 5000, 6000, true, true),
  ('CORTE-033', 'Palomita',     'palomita',     'Corte tierno con leve marmolado, de la zona delantera. Ideal a la plancha o brochettes.', 'variable_weight', 14990, 'clasicos', '{"coccion":"Plancha","punto":"Jugoso (a punto)","tiempo":"8-12 min"}'::jsonb, 500, 6000, 7000, true, true)
on conflict (slug) do update set
  name          = excluded.name,
  sku           = excluded.sku,
  description   = excluded.description,
  sale_mode     = excluded.sale_mode,
  price_per_kg  = excluded.price_per_kg,
  categoria     = excluded.categoria,
  meta          = excluded.meta,
  min_weight_grams = excluded.min_weight_grams,
  max_weight_grams = excluded.max_weight_grams,
  vacuum_packed = excluded.vacuum_packed;

-- 2) Fotos propias para los cortes ya existentes. La URL es relativa a la raíz
--    del sitio (public/), que es como se sirven las imágenes del proyecto.
update public.products as p
set image_url = v.image_url
from (values
  ('vacio',             'images/cortes/vacio.jpeg'),
  ('tapa-asado',        'images/cortes/tapa-de-asado.jpeg'),
  ('matambre',          'images/cortes/matambre.jpeg'),
  ('entrana',           'images/cortes/entrana.jpeg'),
  ('falda',             'images/cortes/falda.jpeg'),
  ('ojo-de-bife',       'images/cortes/ojo-de-bife.jpeg'),
  ('lomo',              'images/cortes/lomo.jpeg'),
  ('peceto',            'images/cortes/peceto.jpeg'),
  ('nalga',             'images/cortes/nalga.jpeg'),
  ('bola-lomo',         'images/cortes/bola-de-lomo.jpeg'),
  ('cuadrada',          'images/cortes/cuadrada.jpeg'),
  ('cuadril',           'images/cortes/cuadril.jpeg'),
  ('colita-cuadril',    'images/cortes/colita-de-cuadril.jpeg'),
  ('roast-beef',        'images/cortes/roast-beef.jpeg'),
  ('paleta',            'images/cortes/paleta.jpeg'),
  ('tapa-nalga',        'images/cortes/tapa-de-nalga.jpeg'),
  ('picada',            'images/cortes/picada.jpeg'),
  ('osobuco',           'images/cortes/osobuco.jpeg'),
  ('aguja',             'images/cortes/aguja.jpeg'),
  ('bife-ancho',        'images/cortes/bife-ancho.jpeg'),
  ('bife-angosto',      'images/cortes/bife-de-chorizo.jpeg'),
  ('tira-asado',        'images/cortes/tira-de-asado.jpeg'),
  ('tortuguita',        'images/cortes/tortuguita.webp'),
  ('palomita',          'images/cortes/palomita.jpeg'),
  ('t-bone',            'images/cortes/t-bone.jpeg'),
  ('tomahawk',          'images/cortes/tomahawk.jpeg'),
  ('picana',            'images/cortes/picana.jpeg'),
  ('osobuco-rey',       'images/cortes/osobuco-rey.jpeg')
) as v(slug, image_url)
where p.slug = v.slug
  and coalesce(p.image_url, '') <> v.image_url;

-- 3) Cortes retirados del catálogo a pedido del negocio. Se marcan is_active=false
--    (no se borran las filas: se preserva el historial de ventas/auditoría).
update public.products set is_active = false where slug in ('bifes', 'bife-lomo-media-res', 'completo', 'mocho');