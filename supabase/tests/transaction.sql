-- Run in SQL Editor as the project owner. All temporary state is rolled back.
begin;
insert into public.porsi_state(id, revision, document)
values ('main', 0, '{"verification_only":true}')
on conflict (id) do nothing;

set local role service_role;
do $$
declare rev bigint; doc jsonb;
begin
  select revision, document into rev, doc from public.porsi_state where id = 'main';
  if not public.porsi_compare_and_swap(rev, doc) then
    raise exception 'CAS write failed';
  end if;
  if public.porsi_compare_and_swap(rev, doc) then
    raise exception 'Stale revision accepted';
  end if;
end;
$$;

set local role anon;
do $$
begin
  begin
    perform id from public.porsi_state;
    raise exception 'Anonymous read unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local role authenticated;
do $$
begin
  begin
    perform id from public.porsi_state;
    raise exception 'Authenticated read unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;
rollback;
select 'PASS: transaction, stale revision rejection, role isolation; test state rolled back' as verification;
