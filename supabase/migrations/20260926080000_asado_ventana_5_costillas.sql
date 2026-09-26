-- El cliente pidio precisar el nombre del corte: "Asado de Ventana" -> "Asado de
-- Ventana de 5 costillas", que es como se vende y como esta rotulada la foto.
--
-- Solo UPDATE sobre public.products: no se toca el esquema ni la semilla de
-- 20260926060000 (esa migracion ya esta aplicada en remoto; editarla haria
-- fallar `supabase db push` por checksum). Mismo criterio que
-- 20260926050000_vacio_sin_tilde.sql.
--
-- Idempotente: se puede re-ejecutar sin efectos secundarios.
--
-- PENDIENTE: la fila apunta a 'images/cortes/asado-ventana-5-costillas.jpeg' y ese
-- archivo todavia no esta en public/images/cortes/, asi que la card sale sin foto.
-- No se cambia la URL a proposito: preferimos sin imagen antes que una foto de un
-- corte equivocado. Hay que agregar el archivo a la carpeta.
update public.products
set name = 'Asado de Ventana de 5 costillas'
where slug = 'asado-ventana';

-- La descripcion ya decia "cinco costillas"; se homologa a "5 costillas" para que
-- el numero coincida con el nombre visible.
update public.products
set description = replace(
  description,
  'cinco costillas',
  '5 costillas'
)
where slug = 'asado-ventana'
  and description like '%cinco costillas%';
