-- Adiciona o valor de entrada pago em cada ordem de serviço.
-- Seguro para bancos existentes: preserva todas as OS e define entrada 0 nas antigas.

alter table public.service_orders
  add column if not exists down_payment numeric(12,2) not null default 0;

update public.service_orders
set down_payment = 0
where down_payment is null;

alter table public.service_orders
  alter column down_payment set default 0,
  alter column down_payment set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'service_orders_down_payment_nonnegative'
      and conrelid = 'public.service_orders'::regclass
  ) then
    alter table public.service_orders
      add constraint service_orders_down_payment_nonnegative
      check (down_payment >= 0);
  end if;
end
$$;
