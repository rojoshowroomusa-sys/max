-- Core catalog, recurring boxes, subscriptions, and recipes for an online meat store.
-- Requires Supabase's auth schema for subscriptions.user_id.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  slug text not null unique,
  description text,
  sale_mode text not null default 'fixed_unit',
  price_per_kg numeric(12, 2) not null check (price_per_kg >= 0),
  unit_weight_grams integer,
  min_weight_grams integer,
  max_weight_grams integer,
  stock_grams integer not null default 0 check (stock_grams >= 0),
  vacuum_packed boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint products_sale_mode_check check (sale_mode in ('fixed_unit', 'estimated_weight', 'variable_weight')),
  constraint products_weight_rules_check check (
    (sale_mode = 'fixed_unit' and unit_weight_grams is not null and unit_weight_grams > 0 and min_weight_grams is null and max_weight_grams is null)
    or (sale_mode in ('estimated_weight', 'variable_weight') and unit_weight_grams is null and min_weight_grams is not null and min_weight_grams > 0 and max_weight_grams is not null and max_weight_grams >= min_weight_grams)
  )
);

create index products_active_idx on public.products (is_active);
create index products_sale_mode_idx on public.products (sale_mode);

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create table public.boxes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  periodicity text not null,
  price numeric(12, 2) not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint boxes_periodicity_check check (periodicity in ('weekly', 'monthly'))
);

create index boxes_active_idx on public.boxes (is_active);
create index boxes_periodicity_idx on public.boxes (periodicity);

create trigger boxes_set_updated_at
before update on public.boxes
for each row execute function public.set_updated_at();

create table public.box_items (
  box_id uuid not null references public.boxes(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(10, 3) not null check (quantity > 0),
  quantity_unit text not null default 'unit',
  notes text,
  primary key (box_id, product_id),
  constraint box_items_quantity_unit_check check (quantity_unit in ('unit', 'g', 'kg'))
);

create index box_items_product_idx on public.box_items (product_id);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  box_id uuid not null references public.boxes(id) on delete restrict,
  status text not null default 'active',
  started_at timestamptz not null default timezone('utc', now()),
  next_delivery_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint subscriptions_status_check check (status in ('active', 'paused', 'canceled')),
  constraint subscriptions_canceled_at_check check (
    (status = 'canceled' and canceled_at is not null) or (status <> 'canceled' and canceled_at is null)
  )
);

create index subscriptions_user_status_idx on public.subscriptions (user_id, status);
create index subscriptions_next_delivery_idx on public.subscriptions (next_delivery_at) where status = 'active';

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text,
  instructions text not null,
  marinade text,
  cooking_method text,
  cooking_time_minutes integer check (cooking_time_minutes is null or cooking_time_minutes > 0),
  published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index recipes_published_idx on public.recipes (published);

create trigger recipes_set_updated_at
before update on public.recipes
for each row execute function public.set_updated_at();

create table public.recipe_products (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  is_primary boolean not null default false,
  quantity numeric(10, 3),
  quantity_unit text,
  primary key (recipe_id, product_id),
  constraint recipe_products_quantity_check check (quantity is null or quantity > 0),
  constraint recipe_products_quantity_unit_check check (quantity_unit is null or quantity_unit in ('g', 'kg', 'unit'))
);

create index recipe_products_product_idx on public.recipe_products (product_id);
create unique index recipe_products_one_primary_idx
  on public.recipe_products (recipe_id)
  where is_primary;

alter table public.products enable row level security;
alter table public.boxes enable row level security;
alter table public.box_items enable row level security;
alter table public.subscriptions enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_products enable row level security;

create policy "Anyone can view active products"
on public.products for select
using (is_active);

create policy "Anyone can view active boxes"
on public.boxes for select
using (is_active);

create policy "Anyone can view items in active boxes"
on public.box_items for select
using (exists (
  select 1 from public.boxes
  where boxes.id = box_items.box_id and boxes.is_active
));

create policy "Users can view their subscriptions"
on public.subscriptions for select
using (auth.uid() = user_id);

create policy "Users can create their subscriptions"
on public.subscriptions for insert
with check (auth.uid() = user_id);

create policy "Users can update their subscriptions"
on public.subscriptions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their subscriptions"
on public.subscriptions for delete
using (auth.uid() = user_id);

create policy "Anyone can view published recipes"
on public.recipes for select
using (published);

create policy "Anyone can view products in published recipes"
on public.recipe_products for select
using (exists (
  select 1 from public.recipes
  where recipes.id = recipe_products.recipe_id and recipes.published
));
