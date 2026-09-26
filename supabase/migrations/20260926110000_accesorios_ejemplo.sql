-- Accesorios de ejemplo para la tienda.
-- Los precios son PLACEHOLDER ($1, $2, $3): reemplazalos con los precios reales
-- antes de correr esta migracion. No vendas con estos precios.
--
-- Para editar los precios: busca los valores numericos (1.00, 2.00, 3.00)
-- y reemplazalos con los precios reales de cada accesorio.
--
-- Despues de correr esta migracion, tambien hay que actualizar el fallback
-- en public/js/products.js con los mismos productos y precios reales.
-- (El fallback solo se usa si Supabase no esta disponible, pero es buena
-- practica mantenerlos sincronizados.)

insert into public.accesorios (name, slug, icon, description, price, regular_price, stock_units, is_active)
values
  ('Cuchillo de Parrilla', 'cuchillo-parrilla', '🔪', 'Cuchillo de acero inoxidable con mango de madera. Ideal para cortar carne.', 1.00, null, 10, true),
  ('Pincel para Parrilla', 'pincel-parrilla', '🖌️', 'Pincel de silicona para pasar aceite y adobos sobre la carne.', 2.00, null, 20, true),
  ('Atizador de Parrilla', 'atizador-parrilla', '🪵', 'Atizador de madera para mover la carne sin pincharla.', 3.00, null, 15, true),
  ('Mate de Algarrobo', 'mate-algarrobo', '🧉', 'Mate de algarrobo con virola de alpaca. Incluye bombilla.', 1.00, null, 8, true),
  ('Guantes para Parrilla', 'guantes-parrilla', '🧤', 'Guantes de cuero resistentes al calor. Talle único.', 2.00, null, 12, true),
  ('Tabla de Cortar', 'tabla-cortar', '🪵', 'Tabla de madera de 40x30 cm. Ideal para cortar carne.', 3.00, null, 5, true)
on conflict (slug) do update
  set name = excluded.name,
      icon = excluded.icon,
      description = excluded.description,
      price = excluded.price,
      regular_price = excluded.regular_price,
      stock_units = excluded.stock_units,
      is_active = excluded.is_active;
