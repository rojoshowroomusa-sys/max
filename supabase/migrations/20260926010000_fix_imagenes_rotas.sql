-- Imágenes rotas: apuntaban a assets/cortes/*.jpg (layout viejo de la rama
-- agente-ia) que no existe en public/ -> 404. Se repuntan a las fotos propias
-- ya presentes en public/images/cortes/.
update public.products
set image_url = 'images/cortes/bife-de-chorizo.jpeg'
where slug = 'bife-chorizo';

update public.products
set image_url = 'images/cortes/ojo-de-bife.jpeg'
where slug = 'ojo-bife';
