-- asado: la foto pasó de Supabase Storage al bundle del sitio (igual que el
-- resto de los cortes), con la marca de agua ya aplicada.
update public.products
set image_url = 'images/cortes/asado.jpeg'
where slug = 'asado';
