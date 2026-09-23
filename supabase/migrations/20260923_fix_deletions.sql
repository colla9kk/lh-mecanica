-- Execute uma vez no SQL Editor do Supabase existente.
-- Atualiza as regras; executar este arquivo não exclui nenhum registro.
-- Reexecutar é seguro. Exclusões só ocorrem ao confirmar no painel.
begin;

create or replace function public.lock_delivered_order() returns trigger
language plpgsql as $$
begin
  -- DELETE has no NEW row. Returning NEW here silently cancelled every deletion.
  -- Delivered orders remain read-only, but can be explicitly deleted by the panel.
  if tg_op = 'DELETE' then
    return old;
  end if;
  if old.status = 'entregue' then
    raise exception 'Ordens entregues não podem ser alteradas. Crie uma nova ordem.';
  end if;
  return new;
end;
$$;

-- Runs as the signed-in user: existing grants and RLS continue to apply.
create or replace function public.delete_workshop_record(
  p_record_type text,
  p_record_id uuid
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deleted_count integer := 0;
  vehicle_count integer := 0;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Entre no painel para excluir registros.';
  end if;
  if p_record_id is null or p_record_type is null or p_record_type not in ('order', 'vehicle', 'customer') then
    raise exception using errcode = '22023', message = 'Registro inválido.';
  end if;

  if p_record_type = 'order' then
    -- Items are removed by the existing ON DELETE CASCADE foreign key.
    -- The customer and vehicle are never deleted along with an order.
    delete from public.service_orders where id = p_record_id;
    get diagnostics deleted_count = row_count;

  elsif p_record_type = 'vehicle' then
    -- An existing OS still protects its vehicle through ON DELETE RESTRICT.
    delete from public.vehicles where id = p_record_id;
    get diagnostics deleted_count = row_count;

  else
    -- Lock the parent before inspecting its children. Everything below is one
    -- transaction; an error cannot leave only some of the customer's cars deleted.
    perform 1 from public.customers where id = p_record_id for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'Cliente não encontrado ou sem permissão.';
    end if;
    perform 1 from public.vehicles where customer_id = p_record_id order by id for update;

    if exists (
      select 1 from public.service_orders o
      where o.customer_id = p_record_id
        or o.vehicle_id in (select v.id from public.vehicles v where v.customer_id = p_record_id)
    ) then
      raise exception using errcode = '23503', message = 'Exclua as ordens de serviço deste cliente antes de excluir o cadastro.';
    end if;

    delete from public.vehicles where customer_id = p_record_id;
    get diagnostics vehicle_count = row_count;
    delete from public.customers where id = p_record_id;
    get diagnostics deleted_count = row_count;
  end if;

  -- Do not report success for a missing/hidden row or a trigger that skipped DELETE.
  if deleted_count <> 1 then
    raise exception using errcode = 'P0002', message = 'O banco não confirmou a exclusão. Atualize a lista e tente novamente.';
  end if;

  return jsonb_build_object(
    'deleted', true,
    'id', p_record_id,
    'type', p_record_type,
    'vehicles_deleted', vehicle_count
  );
end;
$$;

revoke all on function public.delete_workshop_record(text, uuid) from public, anon;
grant execute on function public.delete_workshop_record(text, uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
