-- =====================================================================
--  Combos comprables: precio fijo por unidad, integrados al carrito
--  y al checkout de Mercado Pago.
--
--  Un combo NO es un corte por kg: es un paquete armado con precio
--  cerrado. Para poder mezclarlo en el mismo pedido que los cortes
--  sueltos necesitamos:
--    1) Saber cuántos kilos entrega cada combo (total_kg) para que el
--       total de kilos del pedido siga siendo honesto.
--    2) Marcar en order_items si la línea es corte o combo, y cuántas
--       unidades se vendieron, para que el subtotal sea inequívoco.
--
--  Es idempotente: se puede correr más de una vez.
-- =====================================================================

-- 1) Kilos que entrega cada combo (para el total de kilos del pedido)
alter table public.combos
  add column if not exists total_kg numeric(10, 2);

update public.combos set total_kg = 4   where slug = 'combo-asado';
update public.combos set total_kg = 6   where slug = 'combo-parrillada';
update public.combos set total_kg = 2   where slug = 'combo-premium';

-- Todo combo debe declarar kilos válidos: sin esto el total del pedido
-- mentiría. Si aparece un combo nuevo sin completar, la migración falla
-- con un mensaje claro en vez de publicar una cantidad silenciosamente.
do $$
begin
  if exists (
    select 1 from public.combos
    where total_kg is null or total_kg <= 0
  ) then
    raise exception 'Hay combos sin total_kg válido. Completalos y volvé a ejecutar la migración.';
  end if;
end
$$;

alter table public.combos
  alter column total_kg set default 0;

alter table public.combos
  alter column total_kg set not null;

alter table public.combos
  drop constraint if exists combos_total_kg_positive;

alter table public.combos
  add constraint combos_total_kg_positive check (total_kg > 0);

-- 2) order_items: distinguir corte (por kg) de combo (por unidad)
alter table public.order_items
  add column if not exists kind text not null default 'corte',
  add column if not exists qty_units numeric(12, 2);

alter table public.order_items
  drop constraint if exists order_items_kind_check;

alter table public.order_items
  add constraint order_items_kind_check check (kind in ('corte', 'combo'));

-- 3) Coherencia: un combo siempre tiene unidades; un corte no.
--    (subtotal lo calcula siempre el servidor)
alter table public.order_items
  drop constraint if exists order_items_kind_shape_check;

alter table public.order_items
  add constraint order_items_kind_shape_check check (
    (kind = 'combo' and qty_units is not null and qty_units > 0)
    or (kind = 'corte' and qty_units is null)
  );

alter table public.order_items
  drop constraint if exists order_items_combo_units_integer_check;

alter table public.order_items
  add constraint order_items_combo_units_integer_check check (
    kind = 'corte' or qty_units = trunc(qty_units)
  );
