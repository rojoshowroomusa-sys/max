-- Dos cortes más a pedido del cliente, con fotos propias que ya estaban en
-- public/images/cortes/ sin usarse:
--   * Asado de Ventana (CORTE-034) — corte nuevo, foto de 5 costillas.
--   * Osobuco del Rey (CORTE-035) — volviente: existía en la siembra original
--     (20260910001000) y en products.js, pero la fila se había perdido de la
--     DB; se restaura con sus mismos datos.
-- Idempotente: on conflict (slug) do nothing no pisa filas existentes ni
-- pisa cambios hechos por el cliente desde el dashboard.
insert into public.products
  (sku, name, slug, description, sale_mode, price_per_kg, categoria, meta,
   min_weight_grams, max_weight_grams, stock_grams, vacuum_packed, is_active,
   image_url)
values
  ('CORTE-034', 'Asado de Ventana', 'asado-ventana',
   'El costillar cortado en ventana: cinco costillas para asar tranquilamente a las brasas. Tierno, con la grasa que lo hace irresistible.',
   'variable_weight', 14990, 'clasicos',
   '{"coccion":"Parrilla lenta","punto":"Bien cocido","tiempo":"40-60 min"}'::jsonb,
   800, 6000, 8000, true, true, 'images/cortes/asado-ventana-5-costillas.jpeg'),
  ('CORTE-035', 'Osobuco del Rey', 'osobuco-rey',
   'Nuestro osobuco premium, seleccionado especialmente para preparaciones de autor.',
   'variable_weight', 16990, 'premium',
   '{"coccion":"Cocción lenta","punto":"Muy tierno","tiempo":"120-150 min"}'::jsonb,
   500, 10000, 9000, true, true, 'images/cortes/osobuco-rey.jpeg')
on conflict (slug) do nothing;
