-- Bife Angosto y Bife de Chorizo son dos cortes distintos, no el mismo.
-- Antes ambos apuntaban a bife-de-chorizo.jpeg (la foto del chorizo),
-- asi que la card del Bife Angosto mostraba la foto equivocada.
--
-- Se le da al Bife Angosto su propia foto: bife-angosto.jpeg.
-- El Bife de Chorizo sigue con bife-de-chorizo.jpeg (sin cambios).
--
-- Idempotente: se puede re-ejecutar sin efectos secundarios.

update public.products
set image_url = 'images/cortes/bife-angosto.jpeg'
where slug = 'bife-angosto';
