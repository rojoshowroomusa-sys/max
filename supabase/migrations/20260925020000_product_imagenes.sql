-- Alimenta products.image_url con fotos libres de Wikimedia Commons.
--
-- Cada URL fue elegida verificando la equivalencia anatómica del corte
-- (tabla cortes vacunos argentinos -> NAMP, p. ej. Wikipedia "Anexo:Cortes
-- de vacuno por país"): Vacío=Flank, Bola de Lomo=Knuckle/Sirloin Tip,
-- Cuadrada=Outside Flat, Cuadril=Top Sirloin, Colita de Cuadril=Tri-Tip,
-- Peceto=Eye Round, Lomo=Tenderloin, Entraña=Skirt, Pecho=Brisket, etc.
--
-- Se usan thumbnails 960px de thumb.wikimedia.org: la CDN de Wikimedia
-- rechaza el hotlinking de tamaños no estándar; 960px es un tamaño estándar.
-- Las imágenes requieren atribución (licencias CC BY / CC BY-SA / GFDL) y
-- NO deben embeberse fuera del proyecto sin mantener esa atribución.
--
-- "peceto" y "mocho" quedan intencionalmente SIN imagen: no existe en
-- Wikimedia Commons una foto exacta y confiable de eye round / cogote, y se
-- prefiere el placeholder a mostrar un corte que no corresponde.

update public.products as p
set image_url = v.image_url
from (values
  ('vacio',             'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/Flank_Steak_piece_of_meat.jpg/960px-Flank_Steak_piece_of_meat.jpg'),
  ('tapa-asado',        'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4e/Raw_Beef_Short_Ribs_Slices.jpg/960px-Raw_Beef_Short_Ribs_Slices.jpg'),
  ('matambre',          'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ee/Matambre2.jpg/960px-Matambre2.jpg'),
  ('entrana',           'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/47/Beef_diaphragm_before_roasting_at_Nikudonya_Yakiniku%2C_Xidan_%2820210429112927%29.jpg/960px-Beef_diaphragm_before_roasting_at_Nikudonya_Yakiniku%2C_Xidan_%2820210429112927%29.jpg'),
  ('lomo',              'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/Beef_tenderloin_tied_and_ready_to_roast.jpg/960px-Beef_tenderloin_tied_and_ready_to_roast.jpg'),
  ('nalga',             'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9e/Beef_round_top_round_steak_in_pan%2C_raw.jpg/960px-Beef_round_top_round_steak_in_pan%2C_raw.jpg'),
  ('bola-lomo',         'https://upload.wikimedia.org/wikipedia/commons/1/18/Knuckle.jpg'),
  ('cuadrada',          'https://upload.wikimedia.org/wikipedia/commons/8/85/Udun-sal_1.jpg'),
  ('cuadril',           'https://upload.wikimedia.org/wikipedia/commons/a/a9/Rump.jpg'),
  ('colita-cuadril',    'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8e/Tri_tip_with_herb_rub.JPG/960px-Tri_tip_with_herb_rub.JPG'),
  ('bifes',             'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/95/Raw_beef_steak%2C_2011.jpg/960px-Raw_beef_steak%2C_2011.jpg'),
  ('roast-beef',        'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/TopRoundRoast.jpg/960px-TopRoundRoast.jpg'),
  ('paleta',            'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1c/U.S._%E3%83%97%E3%83%A9%E3%82%A4%E3%83%A0%E3%83%93%E3%83%BC%E3%83%95_%E8%82%A9%E3%83%AD%E3%83%BC%E3%82%B9_%E3%81%8B%E3%81%9F%E3%81%BE%E3%82%8A_%E3%82%B3%E3%82%B9%E3%83%88%E3%82%B3%E5%B7%9D%E5%B4%8E%E5%80%89%E5%BA%AB_2024%E5%B9%B48%E6%9C%881%E6%97%A5%E3%81%AE%E7%A5%9E%E5%A5%88%E5%B7%9D%E7%9C%8C_202408011914_IMG_9786.jpg/960px-U.S._%E3%83%97%E3%83%A9%E3%82%A4%E3%83%A0%E3%83%93%E3%83%BC%E3%83%95_%E8%82%A9%E3%83%AD%E3%83%BC%E3%82%B9_%E3%81%8B%E3%81%9F%E3%81%BE%E3%82%8A_%E3%82%B3%E3%82%B9%E3%83%88%E3%82%B3%E5%B7%9D%E5%B4%8E%E5%80%89%E5%BA%AB_2024%E5%B9%B48%E6%9C%881%E6%97%A5%E3%81%AE%E7%A5%9E%E5%A5%88%E5%B7%9D%E7%9C%8C_202408011914_IMG_9786.jpg'),
  ('picada',            'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/17/Beef_Saikoro_diced_beef17.jpg/960px-Beef_Saikoro_diced_beef17.jpg'),
  ('osobuco',           'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/63/An_image_of_uncut_and_cut_beef_shank_%28gravy_beef%29_2013-04-08_18-03.jpg/960px-An_image_of_uncut_and_cut_beef_shank_%28gravy_beef%29_2013-04-08_18-03.jpg'),
  ('t-bone',            'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/91/T-bone-raw-MCB.jpg/960px-T-bone-raw-MCB.jpg'),
  ('tomahawk',          'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/61/Tomahawk_steaks_06.jpg/960px-Tomahawk_steaks_06.jpg'),
  ('picana',            'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/00/Picanha_%285290506053%29.jpg/960px-Picanha_%285290506053%29.jpg'),
  ('osobuco-rey',       'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/91/Ossobuco_01-03.jpg/960px-Ossobuco_01-03.jpg'),
  ('pecho',             'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e6/Brisket_topped_with_fat_-_Decmeber_2023_-_Sarah_Stierch.jpg/960px-Brisket_topped_with_fat_-_Decmeber_2023_-_Sarah_Stierch.jpg'),
  ('completo',          'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ec/Assorted_Raw_Beef_Slices_for_Yakiniku.jpg/960px-Assorted_Raw_Beef_Slices_for_Yakiniku.jpg'),
  ('bife-lomo-media-res','https://upload.wikimedia.org/wikipedia/commons/4/44/Striploin_bull1.jpg')
) as v(slug, image_url)
where p.slug = v.slug
  and coalesce(p.image_url, '') <> v.image_url;