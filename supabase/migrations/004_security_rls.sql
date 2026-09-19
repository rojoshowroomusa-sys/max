-- =====================================================
-- MIGRACIÓN 04: Endurecer RLS y exponer catálogo al Data API
-- Objetivo:
--   * Que anon/authenticated puedan LEER el catálogo público activo
--     (products, combos, boxes, box_items, recipes, recipe_products).
--   * Que subscriptions solo sea operada por su dueño (auth.uid()).
--   * Que orders/order_items/payments queden EXCLUSIVOS de service_role
--     (Edge Functions). Sin policies públicas ni grants a anon.
-- Ejecutar DESPUÉS de 003_catalog_corrected.sql.
-- =====================================================

-- 1) Grants explícitos (Data API) para las tablas de lectura pública.
--    Sin estos, PostgREST responde 404 aunque existan policies.
grant select on table public.products to anon, authenticated;
grant select on table public.combos to anon, authenticated;
grant select on table public.boxes to anon, authenticated;
grant select on table public.box_items to anon, authenticated;
grant select on table public.recipes to anon, authenticated;
grant select on table public.recipe_products to anon, authenticated;

-- 2) Subscriptions: CRUD solo para el propietario autenticado.
grant select, insert, update, delete on table public.subscriptions to authenticated;

-- 3) Políticas de lectura pública con TO explícito (anon/authenticated).
drop policy if exists "Anyone can view active products" on public.products;
create policy "Anyone can view active products" on public.products
  for select to anon, authenticated
  using (is_active);

drop policy if exists "Anyone can view active combos" on public.combos;
create policy "Anyone can view active combos" on public.combos
  for select to anon, authenticated
  using (is_active);

drop policy if exists "Anyone can view active boxes" on public.boxes;
create policy "Anyone can view active boxes" on public.boxes
  for select to anon, authenticated
  using (is_active);

drop policy if exists "Anyone can view items in active boxes" on public.box_items;
create policy "Anyone can view items in active boxes" on public.box_items
  for select to anon, authenticated
  using (exists (select 1 from public.boxes where boxes.id = box_items.box_id and boxes.is_active));

drop policy if exists "Anyone can view published recipes" on public.recipes;
create policy "Anyone can view published recipes" on public.recipes
  for select to anon, authenticated
  using (published);

drop policy if exists "Anyone can view products in published recipes" on public.recipe_products;
create policy "Anyone can view products in published recipes" on public.recipe_products
  for select to anon, authenticated
  using (exists (select 1 from public.recipes where recipes.id = recipe_products.recipe_id and recipes.published));

-- 4) Subscriptions: policies con TO authenticated y chequeo de dueño
--    (el patrón correcto: role + ownership, no role a secas).
drop policy if exists "Users can view their subscriptions" on public.subscriptions;
create policy "Users can view their subscriptions" on public.subscriptions
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their subscriptions" on public.subscriptions;
create policy "Users can create their subscriptions" on public.subscriptions
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their subscriptions" on public.subscriptions;
create policy "Users can update their subscriptions" on public.subscriptions
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their subscriptions" on public.subscriptions;
create policy "Users can delete their subscriptions" on public.subscriptions
  for delete to authenticated
  using (auth.uid() = user_id);

-- 5) orders / order_items / payments: solo service_role.
--    Revocar cualquier privilege residual a roles de cliente.
revoke all on table public.orders from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;
revoke all on table public.payments from anon, authenticated;

-- 6) Eliminar helper sin uso que era SECURITY DEFINER en public
--    (ejecutable por cualquier rol, superficie de ataque innecesaria).
drop function if exists public.is_admin();