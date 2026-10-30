-- Harden the anonymous telemetry RPCs.
-- Inputs are validated and bounded. Each visitor is capped per minute, so a single
-- client cannot flood app_logs. Invalid input is ignored rather than stored.

create or replace function public.record_visit(
  p_visitor_id uuid,
  p_path text default '/'
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  total_visitors bigint;
  recent_events bigint;
begin
  if p_visitor_id is null then
    return (select count(*) from public.visitors);
  end if;

  insert into public.visitors(visitor_id)
  values (p_visitor_id)
  on conflict (visitor_id)
  do update set last_seen_at = now();

  select count(*) into recent_events
  from public.app_logs
  where visitor_id = p_visitor_id
    and created_at > now() - interval '1 minute';

  -- Only log the page view when the path is well-formed and the visitor is under the cap.
  -- PostgreSQL ARE regex quantifiers are capped at 255 ({0,255}), so length is checked with length()
  if recent_events < 60 and p_path is not null and length(p_path) <= 500 and p_path ~ '^/[ -~]*$' then
    insert into public.app_logs(level, event_name, path, visitor_id, metadata)
    values ('info', 'visitor.viewed', p_path, p_visitor_id, jsonb_build_object('source', 'orbitboard'));
  end if;

  select count(*) into total_visitors from public.visitors;
  return total_visitors;
end;
$$;

create or replace function public.log_app_event(
  p_event_name text,
  p_level text default 'info',
  p_path text default null,
  p_visitor_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_events bigint;
begin
  -- Reject unexpected event names, oversized metadata and malformed paths.
  if p_event_name is null or p_event_name !~ '^[a-z0-9_.-]{1,120}$' then
    return;
  end if;
  if p_path is not null and (length(p_path) > 500 or p_path !~ '^/[ -~]*$') then
    return;
  end if;
  if pg_column_size(coalesce(p_metadata, '{}'::jsonb)) > 2048 then
    return;
  end if;

  if p_visitor_id is not null then
    select count(*) into recent_events
    from public.app_logs
    where visitor_id = p_visitor_id
      and created_at > now() - interval '1 minute';
    if recent_events >= 60 then
      return;
    end if;
  end if;

  insert into public.app_logs(level, event_name, path, visitor_id, metadata)
  values (
    case when p_level in ('debug','info','warn','error') then p_level else 'info' end,
    p_event_name,
    p_path,
    p_visitor_id,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.record_visit(uuid, text) from public;
grant execute on function public.record_visit(uuid, text) to anon, authenticated;
revoke all on function public.log_app_event(text, text, text, uuid, jsonb) from public;
grant execute on function public.log_app_event(text, text, text, uuid, jsonb) to anon, authenticated;

-- Verification query to run on the live project (read-only):
--   select grantee, privilege_type from information_schema.role_table_grants
--    where table_schema = 'public' and table_name in ('visitors','app_logs','payments','payment_orders');
--   select tablename, policyname from pg_policies where schemaname = 'public';
