-- Regression test. Run only in a disposable test database after schema.sql.
-- Requires the Supabase auth.uid() function/roles, or equivalent test stubs.
-- All fixtures and the failure trigger are rolled back.
begin;

create function public.test_reject_customer_delete() returns trigger language plpgsql as $$
begin
  if old.name = 'TEST_FORCE_FAILURE' then raise exception 'TEST_EXPECTED_FAILURE'; end if;
  return old;
end;
$$;
create trigger test_customer_failure before delete on public.customers
for each row execute function public.test_reject_customer_delete();

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
set local role authenticated;

do $$
declare
  c uuid; v uuid; o uuid; c2 uuid; v2 uuid; c3 uuid; v3 uuid;
  item_id uuid; s text; receipt jsonb; blocked boolean;
begin
  insert into public.customers(name,phone) values ('TEST_CLIENT','13999990000') returning id into c;
  insert into public.vehicles(customer_id,plate,brand,model) values(c,'TST1A01','Teste','Veículo') returning id into v;

  foreach s in array array['aberta','aguardando_aprovacao','aprovada','em_andamento','concluida','entregue','cancelada'] loop
    insert into public.service_orders(customer_id,vehicle_id,reported_problem) values(c,v,'TEST_OS') returning id into o;
    insert into public.service_order_items(service_order_id,type,description,quantity,unit_price,subtotal)
      values(o,'servico','TEST_ITEM',1,100,100) returning id into item_id;
    update public.service_orders set status=s where id=o;

    blocked := false;
    begin
      perform public.delete_workshop_record('vehicle',v);
    exception when foreign_key_violation or restrict_violation then blocked := true;
    end;
    assert blocked, 'Vehicle with OS must remain protected';

    blocked := false;
    begin
      perform public.delete_workshop_record('customer',c);
    exception when foreign_key_violation then blocked := true;
    end;
    assert blocked, 'Customer with OS must remain protected';

    if s = 'entregue' then
      blocked := false;
      begin
        update public.service_orders set total=999 where id=o;
      exception when raise_exception then blocked := true;
      end;
      assert blocked, 'Delivered OS editing must remain locked';
      blocked := false;
      begin
        delete from public.service_order_items where id=item_id;
      exception when raise_exception then blocked := true;
      end;
      assert blocked, 'Deleting a single item must not edit a delivered OS';
    end if;

    receipt := public.delete_workshop_record('order',o);
    assert receipt->>'deleted' = 'true' and receipt->>'id' = o::text, 'Missing deletion receipt';
    assert not exists(select 1 from public.service_orders where id=o), 'OS remained after success';
    assert not exists(select 1 from public.service_order_items where service_order_id=o), 'Orphaned item';
    assert exists(select 1 from public.vehicles where id=v), 'OS deletion removed vehicle';
    assert exists(select 1 from public.customers where id=c), 'OS deletion removed customer';
  end loop;

  perform public.delete_workshop_record('vehicle',v);
  assert not exists(select 1 from public.vehicles where id=v), 'Empty vehicle was not deleted';
  assert exists(select 1 from public.customers where id=c), 'Vehicle deletion removed customer';

  insert into public.vehicles(customer_id,plate,brand,model) values(c,'TST1A02','Teste','1') returning id into v;
  insert into public.vehicles(customer_id,plate,brand,model) values(c,'TST1A03','Teste','2');
  insert into public.customers(name,phone) values ('TEST_OTHER','13999990000') returning id into c2;
  insert into public.vehicles(customer_id,plate,brand,model) values(c2,'TST1A04','Teste','Outro') returning id into v2;

  -- Historical OS has this customer even when the car belongs to someone else.
  insert into public.service_orders(customer_id,vehicle_id,reported_problem) values(c,v2,'TEST_HISTORY') returning id into o;
  blocked := false;
  begin
    perform public.delete_workshop_record('customer',c);
  exception when foreign_key_violation then blocked := true;
  end;
  assert blocked, 'Historical customer link was ignored';
  assert (select count(*) from public.vehicles where customer_id=c) = 2, 'Failure removed part of the fleet';
  perform public.delete_workshop_record('order',o);

  -- OS belongs to another customer, but references this customer's vehicle.
  insert into public.service_orders(customer_id,vehicle_id,reported_problem) values(c2,v,'TEST_HISTORY_2') returning id into o;
  blocked := false;
  begin
    perform public.delete_workshop_record('customer',c);
  exception when foreign_key_violation then blocked := true;
  end;
  assert blocked, 'Vehicle history was ignored';
  perform public.delete_workshop_record('order',o);

  receipt := public.delete_workshop_record('customer',c);
  assert (receipt->>'vehicles_deleted')::integer = 2, 'Wrong dependent vehicle count';
  assert not exists(select 1 from public.customers where id=c), 'Customer remained';
  assert not exists(select 1 from public.vehicles where customer_id=c), 'Customer cars remained';
  assert exists(select 1 from public.vehicles where id=v2), 'Unrelated vehicle was deleted';

  -- A late failure must roll back the earlier vehicle deletions as well.
  insert into public.customers(name,phone) values ('TEST_FORCE_FAILURE','13999990000') returning id into c3;
  insert into public.vehicles(customer_id,plate,brand,model) values(c3,'TST1A05','Teste','Falha') returning id into v3;
  blocked := false;
  begin
    perform public.delete_workshop_record('customer',c3);
  exception when raise_exception then blocked := true;
  end;
  assert blocked, 'Expected test failure was not raised';
  assert exists(select 1 from public.customers where id=c3), 'Failed customer deletion lost customer';
  assert exists(select 1 from public.vehicles where id=v3), 'Failed customer deletion lost vehicle';

  blocked := false;
  begin
    perform public.delete_workshop_record('order',o);
  exception when no_data_found then blocked := true;
  end;
  assert blocked, 'Missing record reported success';

  blocked := false;
  begin
    perform public.delete_workshop_record('invalid',c2);
  exception when invalid_parameter_value then blocked := true;
  end;
  assert blocked, 'Invalid record type accepted';

  perform set_config('request.jwt.claim.sub','',true);
  blocked := false;
  begin
    perform public.delete_workshop_record('vehicle',v2);
  exception when insufficient_privilege then blocked := true;
  end;
  assert blocked, 'Missing session allowed deletion';
  assert exists(select 1 from public.vehicles where id=v2), 'Unauthorized request deleted data';
end;
$$;

reset role;
do $$ begin
  assert not has_function_privilege('anon','public.delete_workshop_record(text,uuid)','execute'), 'Anonymous RPC access was granted';
end; $$;

rollback;
