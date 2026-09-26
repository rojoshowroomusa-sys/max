-- Clasificación a pedido del cliente:
--   Especiales: Picaña, T-Bone, Osobuco del Rey, Tomahawk, Asado de Ventana.
--   Clasico:    todo lo demás.
--
-- La restricción original products_categoria_check (creada fuera del repo,
-- sólo aceptaba clasicos/premium) se reemplaza por el esquema nuevo.
-- Idempotente: se puede re-ejecutar sin efectos secundarios.

-- 1) Sacar la restricción vieja (si no existe, no hace nada).
alter table public.products
  drop constraint if exists products_categoria_check;

-- 2) Reclasificar.
update public.products
set categoria = 'especiales'
where slug in ('picana', 't-bone', 'osobuco-rey', 'tomahawk', 'asado-ventana');

update public.products
set categoria = 'clasico'
where not (slug in ('picana', 't-bone', 'osobuco-rey', 'tomahawk', 'asado-ventana'))
  and categoria is distinct from 'clasico';

-- 3) Nueva restricción acorde al esquema y default para filas futuras.
alter table public.products
  add constraint products_categoria_check check (categoria in ('especiales', 'clasico'));

alter table public.products
  alter column categoria set default 'clasico';
