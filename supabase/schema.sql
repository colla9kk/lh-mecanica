-- Execute este arquivo no SQL Editor de um projeto novo do Supabase.
create extension if not exists pgcrypto;
create sequence if not exists public.service_order_number_seq start 1;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(), name text not null, document text,
  phone text not null, whatsapp text, email text, address text, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  plate text not null unique check (plate = upper(plate) and char_length(plate) between 6 and 7),
  brand text not null, model text not null,
  year integer check (year is null or year between 1900 and 2100), color text,
  mileage integer check (mileage is null or mileage >= 0), fuel text, chassis text, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('OS-' || lpad(nextval('public.service_order_number_seq')::text, 5, '0')),
  customer_id uuid not null references public.customers(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  entry_date date not null default current_date, expected_delivery_date date, completed_at timestamptz,
  mileage integer check (mileage is null or mileage >= 0), reported_problem text not null,
  diagnosis text, notes text,
  status text not null default 'aberta' check (status in ('aberta','aguardando_aprovacao','aprovada','em_andamento','concluida','entregue','cancelada')),
  labor_total numeric(12,2) not null default 0 check (labor_total >= 0),
  parts_total numeric(12,2) not null default 0 check (parts_total >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.service_order_items (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  type text not null check (type in ('servico','mao_de_obra','peca')),
  description text not null, quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index if not exists idx_vehicles_customer on public.vehicles(customer_id);
create index if not exists idx_service_orders_vehicle_date on public.service_orders(vehicle_id, entry_date desc);
create index if not exists idx_service_orders_customer on public.service_orders(customer_id);
create index if not exists idx_service_orders_status on public.service_orders(status);
create index if not exists idx_service_order_items_order on public.service_order_items(service_order_id);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create or replace function public.prepare_service_item() returns trigger language plpgsql as $$
begin new.subtotal = round(new.quantity * new.unit_price, 2); new.updated_at = now(); return new; end; $$;
create or replace function public.lock_delivered_order() returns trigger language plpgsql as $$
begin if old.status = 'entregue' then raise exception 'Ordens entregues não podem ser alteradas. Crie uma nova ordem.'; end if; return new; end; $$;
create or replace function public.lock_delivered_order_items() returns trigger language plpgsql as $$
declare current_status text;
begin
  select status into current_status from public.service_orders where id = coalesce(new.service_order_id, old.service_order_id);
  if current_status = 'entregue' then raise exception 'Itens de ordens entregues não podem ser alterados.'; end if;
  return coalesce(new, old);
end; $$;

drop trigger if exists customers_updated_at on public.customers;
create trigger customers_updated_at before update on public.customers for each row execute function public.set_updated_at();
drop trigger if exists vehicles_updated_at on public.vehicles;
create trigger vehicles_updated_at before update on public.vehicles for each row execute function public.set_updated_at();
drop trigger if exists service_orders_updated_at on public.service_orders;
create trigger service_orders_updated_at before update on public.service_orders for each row execute function public.set_updated_at();
drop trigger if exists service_items_prepare on public.service_order_items;
create trigger service_items_prepare before insert or update on public.service_order_items for each row execute function public.prepare_service_item();
drop trigger if exists service_orders_lock_delivered on public.service_orders;
create trigger service_orders_lock_delivered before update or delete on public.service_orders for each row execute function public.lock_delivered_order();
drop trigger if exists service_items_lock_delivered on public.service_order_items;
create trigger service_items_lock_delivered before insert or update or delete on public.service_order_items for each row execute function public.lock_delivered_order_items();

alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.service_orders enable row level security;
alter table public.service_order_items enable row level security;
drop policy if exists "authenticated customers" on public.customers;
create policy "authenticated customers" on public.customers for all to authenticated using (true) with check (true);
drop policy if exists "authenticated vehicles" on public.vehicles;
create policy "authenticated vehicles" on public.vehicles for all to authenticated using (true) with check (true);
drop policy if exists "authenticated orders" on public.service_orders;
create policy "authenticated orders" on public.service_orders for all to authenticated using (true) with check (true);
drop policy if exists "authenticated items" on public.service_order_items;
create policy "authenticated items" on public.service_order_items for all to authenticated using (true) with check (true);
revoke all on public.customers, public.vehicles, public.service_orders, public.service_order_items from anon;
grant select, insert, update, delete on public.customers, public.vehicles, public.service_orders, public.service_order_items to authenticated;
grant usage, select on sequence public.service_order_number_seq to authenticated;
