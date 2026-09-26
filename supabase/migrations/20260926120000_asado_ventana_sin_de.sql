-- El corte pasa de "Asado de Ventana 5 costillas" a "Asado Ventana 5 costillas":
-- sin la primera preposicion, mas directo y como se vende en la foto.
--
-- Solo UPDATE sobre public.products: no se toca el esquema ni otras filas.
-- Idempotente: se puede re-ejecutar sin efectos secundarios.

update public.products
set name = 'Asado Ventana 5 costillas'
where slug = 'asado-ventana';
