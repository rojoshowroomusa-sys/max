-- El cliente pidió escribir "vacio" sin tilde en todo el catálogo visible:
-- nombre del corte, descripciones de productos y descripciones de combos.
-- Idempotente: se puede re-ejecutar sin efectos secundarios.
update public.products
set name = replace(replace(name, 'Vacío', 'Vacio'), 'vacío', 'vacio')
where name like '%vacío%' or name like '%Vacío%';

update public.products
set description = replace(replace(description, 'Vacío', 'Vacio'), 'vacío', 'vacio')
where description like '%vacío%' or description like '%Vacío%';

update public.combos
set description = replace(replace(description, 'Vacío', 'Vacio'), 'vacío', 'vacio')
where description like '%vacío%' or description like '%Vacío%';
