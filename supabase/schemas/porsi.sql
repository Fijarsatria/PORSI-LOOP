-- Declarative schema for the multi-outlet server. All writes go through the
-- authenticated Next.js server and its domain transaction engine.
-- No user is permitted to read or replace the entire state document directly.
create table if not exists public.porsi_state (
  id text primary key check (id = 'main'),
  revision bigint not null default 0 check (revision >= 0),
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.porsi_state enable row level security;
alter table public.porsi_state force row level security;
revoke all on public.porsi_state from anon, authenticated;
grant select, insert, update on public.porsi_state to service_role;

-- Revocable server sessions prevent an old encrypted cookie remaining usable
-- after logout while its Supabase access JWT is still within its lifetime.
create table if not exists public.porsi_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);
create index if not exists porsi_sessions_user_id_idx on public.porsi_sessions(user_id);
create index if not exists porsi_sessions_expires_at_idx on public.porsi_sessions(expires_at);
alter table public.porsi_sessions enable row level security;
alter table public.porsi_sessions force row level security;
revoke all on public.porsi_sessions from anon, authenticated;
grant select, insert, delete on public.porsi_sessions to service_role;

-- SECURITY INVOKER is deliberate. The service role already has the necessary
-- privileges; no definer-privilege escalation is exposed to API consumers.
create or replace function public.porsi_compare_and_swap(
  expected_revision bigint,
  next_document jsonb
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare changed integer;
begin
  if pg_catalog.jsonb_typeof(next_document) <> 'object' then
    raise exception 'document must be an object';
  end if;
  update public.porsi_state
  set document = next_document,
      revision = revision + 1,
      updated_at = pg_catalog.now()
  where id = 'main' and revision = expected_revision;
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

revoke all on function public.porsi_compare_and_swap(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.porsi_compare_and_swap(bigint, jsonb) to service_role;
