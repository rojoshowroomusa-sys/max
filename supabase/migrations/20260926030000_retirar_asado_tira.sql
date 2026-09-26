-- "Asado de Tira" fuera del catálogo a pedido del cliente.
-- Idempotente: se puede re-ejecutar sin efectos secundarios.
update public.products
set is_active = false
where slug = 'asado';
