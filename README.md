# Esquema inicial para tienda de carne online

La migracion `supabase/migrations/20260909000100_create_meat_store_schema.sql` crea el primer modelo de datos para el catalogo, las cajas recurrentes, las suscripciones y las recetas.

## Modelo

- `products`: un producto/corte. `sale_mode` admite `fixed_unit`, `estimated_weight` o `variable_weight`. El precio se guarda en `price_per_kg`; el stock se normaliza a gramos en `stock_grams`.
- `boxes`: una caja recurrente como `Kit Asado` o `Kit Semanal`, con periodicidad `weekly` o `monthly` y precio total.
- `box_items`: productos incluidos en cada caja, con cantidad y unidad (`unit`, `g` o `kg`).
- `subscriptions`: suscripcion de un usuario autenticado a una caja. Su `status` puede ser `active`, `paused` o `canceled`.
- `recipes`: guia de cocina o marinada, con metodo y tiempo opcionales.
- `recipe_products`: relacion muchos-a-muchos entre recetas y cortes; permite marcar un producto principal y cantidades opcionales.

## Aplicacion con Supabase CLI

Desde la raiz del proyecto:

```bash
supabase start
supabase db reset
```

`db reset` ejecuta la migracion sobre la base local. Para aplicar migraciones a un proyecto remoto enlazado:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Antes de ejecutar en produccion, revisar el diff generado por Supabase y hacer una copia de seguridad conforme al proceso del proyecto.

## Ejemplos de datos

```sql
insert into public.products
  (sku, name, slug, sale_mode, price_per_kg, unit_weight_grams, stock_grams, vacuum_packed)
values
  ('VAC-001', 'Vacio', 'vacio', 'variable_weight', 15990, null, 25000, true);

insert into public.boxes (name, slug, periodicity, price)
values ('Kit Asado', 'kit-asado', 'monthly', 49990)
returning id;

-- Usar el id devuelto para asociar los productos de la caja.
insert into public.box_items (box_id, product_id, quantity, quantity_unit)
values ('<box-id>', '<product-id>', 2, 'kg');

insert into public.recipes
  (title, slug, summary, instructions, marinade, cooking_method, cooking_time_minutes, published)
values
  ('Vacio a la parrilla', 'vacio-a-la-parrilla', 'Corte tierno y jugoso',
   'Secar, salar y cocinar hasta el punto deseado.',
   'Aceite, ajo y hierbas durante 4 horas.', 'parrilla', 45, true)
returning id;

insert into public.recipe_products (recipe_id, product_id, is_primary)
values ('<recipe-id>', '<product-id>', true);
```

## Siguiente paso recomendado

1. Ejecutar la migracion en un proyecto local y revisar las restricciones con datos reales.
2. Crear una politica administrativa para que el panel de backoffice pueda gestionar productos, cajas y recetas. La migracion deja esas escrituras fuera del acceso publico; el `service_role` de Supabase puede operar en tareas server-side.
3. Decidir si el cobro y el envio requieren tablas posteriores como `orders`, `order_items`, direcciones y eventos de entrega. La suscripcion actual modela el ciclo recurrente, no el historial de cobros.
4. Añadir validacion de negocio en la API: por ejemplo, impedir que un producto de venta fija se agregue a una caja expresada en kilos, o reservar stock dentro de una transaccion al crear un pedido.

La politica publica solo expone productos y cajas activos, recetas publicadas y sus items. Las suscripciones solo son visibles y modificables por su propietario autenticado.
