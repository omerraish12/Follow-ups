-- Creates the exec_sql RPC and forces PostgREST to reload schema.
-- Run locally with psql:
--   psql "<your-supabase-connection-string>" -f supabase/000_create_exec_sql_and_reload.sql

drop function if exists public.exec_sql(text, jsonb);

create or replace function public.exec_sql(sql text, params jsonb default '[]')
returns setof jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  stmt text;
begin
  stmt := format('with q as (%s) select to_jsonb(q.*) from q', sql);

  return query execute stmt using
      -- param 0
      case 
        when jsonb_typeof(params->0) = 'number' then (params->>0)::numeric
        when jsonb_typeof(params->0) = 'boolean' then (params->>0)::boolean
        when jsonb_typeof(params->0) = 'string' and (params->>0) ~ '^(true|false)$' then (params->>0)::boolean
        when jsonb_typeof(params->0) = 'string' and (params->>0) ~ '^-?\\d+(\\.\\d+)?$' then (params->>0)::numeric
        when jsonb_typeof(params->0) = 'null' then null
        else nullif(params->>0,'')
      end,
      -- param 1
      case 
        when jsonb_typeof(params->1) = 'number' then (params->>1)::numeric
        when jsonb_typeof(params->1) = 'boolean' then (params->>1)::boolean
        when jsonb_typeof(params->1) = 'string' and (params->>1) ~ '^(true|false)$' then (params->>1)::boolean
        when jsonb_typeof(params->1) = 'string' and (params->>1) ~ '^-?\\d+(\\.\\d+)?$' then (params->>1)::numeric
        when jsonb_typeof(params->1) = 'null' then null
        else nullif(params->>1,'')
      end,
      -- param 2
      case 
        when jsonb_typeof(params->2) = 'number' then (params->>2)::numeric
        when jsonb_typeof(params->2) = 'boolean' then (params->>2)::boolean
        when jsonb_typeof(params->2) = 'string' and (params->>2) ~ '^(true|false)$' then (params->>2)::boolean
        when jsonb_typeof(params->2) = 'string' and (params->>2) ~ '^-?\\d+(\\.\\d+)?$' then (params->>2)::numeric
        when jsonb_typeof(params->2) = 'null' then null
        else nullif(params->>2,'')
      end,
      -- param 3
      case 
        when jsonb_typeof(params->3) = 'number' then (params->>3)::numeric
        when jsonb_typeof(params->3) = 'boolean' then (params->>3)::boolean
        when jsonb_typeof(params->3) = 'string' and (params->>3) ~ '^(true|false)$' then (params->>3)::boolean
        when jsonb_typeof(params->3) = 'string' and (params->>3) ~ '^-?\\d+(\\.\\d+)?$' then (params->>3)::numeric
        when jsonb_typeof(params->3) = 'null' then null
        else nullif(params->>3,'')
      end,
      -- param 4
      case 
        when jsonb_typeof(params->4) = 'number' then (params->>4)::numeric
        when jsonb_typeof(params->4) = 'boolean' then (params->>4)::boolean
        when jsonb_typeof(params->4) = 'string' and (params->>4) ~ '^(true|false)$' then (params->>4)::boolean
        when jsonb_typeof(params->4) = 'string' and (params->>4) ~ '^-?\\d+(\\.\\d+)?$' then (params->>4)::numeric
        when jsonb_typeof(params->4) = 'null' then null
        else nullif(params->>4,'')
      end,
      -- param 5
      case 
        when jsonb_typeof(params->5) = 'number' then (params->>5)::numeric
        when jsonb_typeof(params->5) = 'boolean' then (params->>5)::boolean
        when jsonb_typeof(params->5) = 'string' and (params->>5) ~ '^(true|false)$' then (params->>5)::boolean
        when jsonb_typeof(params->5) = 'string' and (params->>5) ~ '^-?\\d+(\\.\\d+)?$' then (params->>5)::numeric
        when jsonb_typeof(params->5) = 'null' then null
        else nullif(params->>5,'')
      end,
      -- param 6
      case 
        when jsonb_typeof(params->6) = 'number' then (params->>6)::numeric
        when jsonb_typeof(params->6) = 'boolean' then (params->>6)::boolean
        when jsonb_typeof(params->6) = 'string' and (params->>6) ~ '^(true|false)$' then (params->>6)::boolean
        when jsonb_typeof(params->6) = 'string' and (params->>6) ~ '^-?\\d+(\\.\\d+)?$' then (params->>6)::numeric
        when jsonb_typeof(params->6) = 'null' then null
        else nullif(params->>6,'')
      end,
      -- param 7
      case 
        when jsonb_typeof(params->7) = 'number' then (params->>7)::numeric
        when jsonb_typeof(params->7) = 'boolean' then (params->>7)::boolean
        when jsonb_typeof(params->7) = 'string' and (params->>7) ~ '^(true|false)$' then (params->>7)::boolean
        when jsonb_typeof(params->7) = 'string' and (params->>7) ~ '^-?\\d+(\\.\\d+)?$' then (params->>7)::numeric
        when jsonb_typeof(params->7) = 'null' then null
        else nullif(params->>7,'')
      end,
      -- param 8
      case 
        when jsonb_typeof(params->8) = 'number' then (params->>8)::numeric
        when jsonb_typeof(params->8) = 'boolean' then (params->>8)::boolean
        when jsonb_typeof(params->8) = 'string' and (params->>8) ~ '^(true|false)$' then (params->>8)::boolean
        when jsonb_typeof(params->8) = 'string' and (params->>8) ~ '^-?\\d+(\\.\\d+)?$' then (params->>8)::numeric
        when jsonb_typeof(params->8) = 'null' then null
        else nullif(params->>8,'')
      end,
      -- param 9
      case 
        when jsonb_typeof(params->9) = 'number' then (params->>9)::numeric
        when jsonb_typeof(params->9) = 'boolean' then (params->>9)::boolean
        when jsonb_typeof(params->9) = 'string' and (params->>9) ~ '^(true|false)$' then (params->>9)::boolean
        when jsonb_typeof(params->9) = 'string' and (params->>9) ~ '^-?\\d+(\\.\\d+)?$' then (params->>9)::numeric
        when jsonb_typeof(params->9) = 'null' then null
        else nullif(params->>9,'')
      end,
      -- param 10
      case 
        when jsonb_typeof(params->10) = 'number' then (params->>10)::numeric
        when jsonb_typeof(params->10) = 'boolean' then (params->>10)::boolean
        when jsonb_typeof(params->10) = 'string' and (params->>10) ~ '^(true|false)$' then (params->>10)::boolean
        when jsonb_typeof(params->10) = 'string' and (params->>10) ~ '^-?\\d+(\\.\\d+)?$' then (params->>10)::numeric
        when jsonb_typeof(params->10) = 'null' then null
        else nullif(params->>10,'')
      end,
      -- param 11
      case 
        when jsonb_typeof(params->11) = 'number' then (params->>11)::numeric
        when jsonb_typeof(params->11) = 'boolean' then (params->>11)::boolean
        when jsonb_typeof(params->11) = 'string' and (params->>11) ~ '^(true|false)$' then (params->>11)::boolean
        when jsonb_typeof(params->11) = 'string' and (params->>11) ~ '^-?\\d+(\\.\\d+)?$' then (params->>11)::numeric
        when jsonb_typeof(params->11) = 'null' then null
        else nullif(params->>11,'')
      end,
      -- param 12
      case 
        when jsonb_typeof(params->12) = 'number' then (params->>12)::numeric
        when jsonb_typeof(params->12) = 'boolean' then (params->>12)::boolean
        when jsonb_typeof(params->12) = 'string' and (params->>12) ~ '^(true|false)$' then (params->>12)::boolean
        when jsonb_typeof(params->12) = 'string' and (params->>12) ~ '^-?\\d+(\\.\\d+)?$' then (params->>12)::numeric
        when jsonb_typeof(params->12) = 'null' then null
        else nullif(params->>12,'')
      end,
      -- param 13
      case 
        when jsonb_typeof(params->13) = 'number' then (params->>13)::numeric
        when jsonb_typeof(params->13) = 'boolean' then (params->>13)::boolean
        when jsonb_typeof(params->13) = 'string' and (params->>13) ~ '^(true|false)$' then (params->>13)::boolean
        when jsonb_typeof(params->13) = 'string' and (params->>13) ~ '^-?\\d+(\\.\\d+)?$' then (params->>13)::numeric
        when jsonb_typeof(params->13) = 'null' then null
        else nullif(params->>13,'')
      end,
      -- param 14
      case 
        when jsonb_typeof(params->14) = 'number' then (params->>14)::numeric
        when jsonb_typeof(params->14) = 'boolean' then (params->>14)::boolean
        when jsonb_typeof(params->14) = 'string' and (params->>14) ~ '^(true|false)$' then (params->>14)::boolean
        when jsonb_typeof(params->14) = 'string' and (params->>14) ~ '^-?\\d+(\\.\\d+)?$' then (params->>14)::numeric
        when jsonb_typeof(params->14) = 'null' then null
        else nullif(params->>14,'')
      end,
      -- param 15
      case 
        when jsonb_typeof(params->15) = 'number' then (params->>15)::numeric
        when jsonb_typeof(params->15) = 'boolean' then (params->>15)::boolean
        when jsonb_typeof(params->15) = 'string' and (params->>15) ~ '^(true|false)$' then (params->>15)::boolean
        when jsonb_typeof(params->15) = 'string' and (params->>15) ~ '^-?\\d+(\\.\\d+)?$' then (params->>15)::numeric
        when jsonb_typeof(params->15) = 'null' then null
        else nullif(params->>15,'')
      end,
      -- param 16
      case 
        when jsonb_typeof(params->16) = 'number' then (params->>16)::numeric
        when jsonb_typeof(params->16) = 'boolean' then (params->>16)::boolean
        when jsonb_typeof(params->16) = 'string' and (params->>16) ~ '^(true|false)$' then (params->>16)::boolean
        when jsonb_typeof(params->16) = 'string' and (params->>16) ~ '^-?\\d+(\\.\\d+)?$' then (params->>16)::numeric
        when jsonb_typeof(params->16) = 'null' then null
        else nullif(params->>16,'')
      end,
      -- param 17
      case 
        when jsonb_typeof(params->17) = 'number' then (params->>17)::numeric
        when jsonb_typeof(params->17) = 'boolean' then (params->>17)::boolean
        when jsonb_typeof(params->17) = 'string' and (params->>17) ~ '^(true|false)$' then (params->>17)::boolean
        when jsonb_typeof(params->17) = 'string' and (params->>17) ~ '^-?\\d+(\\.\\d+)?$' then (params->>17)::numeric
        when jsonb_typeof(params->17) = 'null' then null
        else nullif(params->>17,'')
      end,
      -- param 18
      case 
        when jsonb_typeof(params->18) = 'number' then (params->>18)::numeric
        when jsonb_typeof(params->18) = 'boolean' then (params->>18)::boolean
        when jsonb_typeof(params->18) = 'string' and (params->>18) ~ '^(true|false)$' then (params->>18)::boolean
        when jsonb_typeof(params->18) = 'string' and (params->>18) ~ '^-?\\d+(\\.\\d+)?$' then (params->>18)::numeric
        when jsonb_typeof(params->18) = 'null' then null
        else nullif(params->>18,'')
      end,
      -- param 19
      case 
        when jsonb_typeof(params->19) = 'number' then (params->>19)::numeric
        when jsonb_typeof(params->19) = 'boolean' then (params->>19)::boolean
        when jsonb_typeof(params->19) = 'string' and (params->>19) ~ '^(true|false)$' then (params->>19)::boolean
        when jsonb_typeof(params->19) = 'string' and (params->>19) ~ '^-?\\d+(\\.\\d+)?$' then (params->>19)::numeric
        when jsonb_typeof(params->19) = 'null' then null
        else nullif(params->>19,'')
      end;
end;
$$;

comment on function public.exec_sql is 'Used by backend via Supabase RPC to run parameterized SQL (service role only).';

notify pgrst, 'reload schema';
