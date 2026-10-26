-- KHYAL starter schema. Review and run in Supabase SQL Editor.
-- The frontend must use only the publishable/anon key. Never expose service_role.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('admin','customer')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  image_url text,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  logo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'رفايع المطبخ',
  brand text not null default 'خيال',
  price numeric(12,2) not null check (price >= 0),
  old_price numeric(12,2) check (old_price is null or old_price >= 0),
  description text,
  image_url text,
  stock integer not null default 0 check (stock >= 0),
  is_featured boolean not null default false,
  is_published boolean not null default true,
  sku text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_published_created_idx on public.products (is_published, created_at desc);
create index if not exists products_category_idx on public.products (category);
create index if not exists products_name_idx on public.products using gin (to_tsvector('simple', name));

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('KH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  customer_name text not null,
  phone text not null,
  governorate text,
  city text,
  address text not null,
  notes text,
  status text not null default 'pending' check (status in ('pending','confirmed','preparing','shipped','delivered','cancelled')),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  shipping_fee numeric(12,2) not null default 0 check (shipping_fee >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12,2) not null check (line_total >= 0)
);

create table if not exists public.store_settings (
  id integer primary key default 1 check (id = 1),
  store_name text not null default 'KHYAL',
  logo_url text,
  whatsapp_number text,
  contact_phone text,
  contact_email text,
  address text,
  shipping_fee numeric(12,2) not null default 0,
  free_shipping_threshold numeric(12,2),
  announcement text,
  updated_at timestamptz not null default now()
);
insert into public.store_settings (id) values (1) on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.store_settings enable row level security;

-- Profiles: users may read/update only their own profile, but role cannot be
-- changed by the user through the policy. Admin bootstrap is documented in README.
create policy "read own profile or admin" on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.is_admin());
create policy "admin manages profiles" on public.profiles for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "public reads visible categories" on public.categories for select to anon, authenticated
using (is_visible or public.is_admin());
create policy "admin manages categories" on public.categories for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "public reads brands" on public.brands for select to anon, authenticated using (true);
create policy "admin manages brands" on public.brands for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "public reads published products" on public.products for select to anon, authenticated
using (is_published or public.is_admin());
create policy "admin inserts products" on public.products for insert to authenticated
with check (public.is_admin());
create policy "admin updates products" on public.products for update to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "admin deletes products" on public.products for delete to authenticated
using (public.is_admin());

-- Orders are private by default. Public order creation is intentionally not
-- enabled until a trusted server-side checkout validates prices and stock.
create policy "admin reads orders" on public.orders for select to authenticated using (public.is_admin());
create policy "admin manages orders" on public.orders for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "admin reads order items" on public.order_items for select to authenticated using (public.is_admin());
create policy "admin manages order items" on public.order_items for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "public reads store settings" on public.store_settings for select to anon, authenticated using (true);
create policy "admin updates store settings" on public.store_settings for update to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Public product images bucket. Upload/delete restricted to admins.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "public can view product images" on storage.objects for select to anon, authenticated
using (bucket_id = 'product-images');
create policy "admin uploads product images" on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and public.is_admin());
create policy "admin updates product images" on storage.objects for update to authenticated
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());
create policy "admin deletes product images" on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and public.is_admin());

-- IMPORTANT: create the first user through Supabase Authentication, then run:
-- insert into public.profiles (id, role)
-- select id, 'admin' from auth.users where email = 'YOUR_ADMIN_EMAIL';
-- Replace the email with your own. Do not create public signup for administrators.
