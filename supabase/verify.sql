-- Read-only installation verification. Run as project owner in SQL Editor.
select current_database() as database_name, current_user as database_role;

select c.relname as table_name, c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('porsi_state', 'porsi_sessions');

select role_name, table_name,
       has_table_privilege(role_name, 'public.' || table_name, 'SELECT') as can_read,
       has_table_privilege(role_name, 'public.' || table_name, 'INSERT') as can_insert,
       has_table_privilege(role_name, 'public.' || table_name, 'UPDATE') as can_update,
       has_table_privilege(role_name, 'public.' || table_name, 'DELETE') as can_delete
from (values ('anon'),('authenticated'),('service_role')) r(role_name)
cross join (values ('porsi_state'),('porsi_sessions')) t(table_name);

select r.role_name,
       has_function_privilege(r.role_name, 'public.porsi_compare_and_swap(bigint,jsonb)', 'EXECUTE') as can_replace_state
from (values ('anon'),('authenticated'),('service_role')) r(role_name);

select p.proname, p.prosecdef as security_definer, p.proconfig
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname='public' and p.proname='porsi_compare_and_swap';

-- Metadata only. No customer tickets, messages, or tokens are printed.
select id, revision, updated_at, pg_column_size(document) as document_bytes
from public.porsi_state;
