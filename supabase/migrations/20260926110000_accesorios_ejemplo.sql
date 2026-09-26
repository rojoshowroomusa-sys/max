-- Accesorios de ejemplo para la tienda.
-- Los precios son PLACEHOLDER ($0.01): reemplazalos con los precios reales
-- antes de correr esta migracion. No vendas con estos precios.
--
-- Para editar los precios: busca el valor 0.01 y reemplazalo con el precio
-- real de cada accesorio. La tabla exige price > 0, por eso se usa 0.01
-- como placeholder minimo valido.
--
-- Despues de correr esta migracion, tambien hay que actualizar el fallback
-- en public/js/products.js con los mismos productos y precios reales.
-- (El fallback solo se usa si Supabase no esta disponible, pero es buena
-- practica mantenerlos sincronizados.)

insert into public.accesorios (name, slug, icon, description, price, regular_price, stock_units, is_active)
values
  ('Cuchillo de Parrilla', 'cuchillo-parrilla', '🔪', 'Cuchillo de acero inoxidable con mango de madera. Ideal para cortar carne.', 0.01, null, 10, true),
  ('Pincel para Parrilla', 'pincel-parrilla', '🖌️', 'Pincel de silicona para pasar aceite y adobos sobre la carne.', 0.01, null, 20, true),
  ('Atizador de Parrilla', 'atizador-parrilla', '🪵', 'Atizador de madera para mover la carne sin pincharla.', 0.01, null, 15, true),
  ('Mate de Algarrobo', 'mate-algarrobo', '🧉', 'Mate de algarrobo con virola de alpaca. Incluye bombilla.', 0.01, null, 8, true),
  ('Guantes para Parrilla', 'guantes-parrilla', '🧤', 'Guantes de cuero resistentes al calor. Talle único.', 0.01, null, 12, true),
  ('Tabla de Cortar', 'tabla-cortar', '🪵', 'Tabla de madera de 40x30 cm. Ideal para cortar carne.', 0.01, null, 5, true)
on conflict (slug) do update
  set name = excluded.name,
      icon = excluded.icon,
      description = excluded.description,
      price = excluded.price,
      regular_price = excluded.regular_price,
      stock_units = excluded.stock_units,
      is_active = excluded.is_active;
