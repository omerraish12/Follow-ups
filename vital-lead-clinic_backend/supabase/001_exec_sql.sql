-- Enables legacy SQL-style queries via Supabase RPC for existing code.
-- Run this once in your Supabase SQL editor or CLI.

create or replace function public.exec_sql(sql text, params jsonb default '[]')
returns setof jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  vals text[] := array(select jsonb_array_elements_text(params));
begin
  -- Wrap the query so each row is returned as jsonb (matching node's result.rows expectation)
  return query execute 'select to_jsonb(t.*) from (' || sql || ') t'
    using variadic vals;
end;
$$;

comment on function public.exec_sql is 'Used by the backend via Supabase RPC to run parameterized SQL safely with service role.';
