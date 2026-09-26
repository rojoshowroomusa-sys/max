-- "Ojo de Bife" estaba duplicado en el catálogo (ojo-bife y ojo-de-bife
-- apuntaban a la misma imagen). Se retira el legado y queda el curado
-- ojo-de-bife (premium, con su propia ficha en el catálogo local).
-- Idempotente: se puede re-ejecutar sin efectos secundarios.
update public.products
set is_active = false
where slug = 'ojo-bife';
