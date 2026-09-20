create extension if not exists pgcrypto;

create table if not exists public.visitors (
  visitor_id uuid primary key,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.app_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  level text not null default 'info',
  event_name text not null,
  path text,
  visitor_id uuid,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists app_logs_created_at_idx on public.app_logs (created_at desc);
create index if not exists app_logs_event_name_idx on public.app_logs (event_name);
create index if not exists app_logs_visitor_id_idx on public.app_logs (visitor_id);

alter table public.visitors enable row level security;
alter table public.app_logs enable row level security;

revoke all on public.visitors from anon, authenticated;
revoke all on public.app_logs from anon, authenticated;

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
begin
  insert into public.visitors(visitor_id)
  values (p_visitor_id)
  on conflict (visitor_id)
  do update set last_seen_at = now();

  insert into public.app_logs(level, event_name, path, visitor_id, metadata)
  values ('info', 'visitor.viewed', left(p_path, 500), p_visitor_id, jsonb_build_object('source', 'orbitboard'));

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
begin
  insert into public.app_logs(level, event_name, path, visitor_id, metadata)
  values (
    case when p_level in ('debug','info','warn','error') then p_level else 'info' end,
    left(p_event_name, 120),
    left(p_path, 500),
    p_visitor_id,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.record_visit(uuid, text) from public;
grant execute on function public.record_visit(uuid, text) to anon, authenticated;

revoke all on function public.log_app_event(text, text, text, uuid, jsonb) from public;
grant execute on function public.log_app_event(text, text, text, uuid, jsonb) to anon, authenticated;


create or replace view public.grafana_visitor_daily as
select
  date_trunc('day', first_seen_at) as day,
  count(*)::bigint as new_visitors
from public.visitors
group by 1
order by 1;

create or replace view public.grafana_event_daily as
select
  date_trunc('day', created_at) as day,
  event_name,
  level,
  count(*)::bigint as events
from public.app_logs
group by 1, 2, 3
order by 1;

create or replace view public.grafana_tool_usage as
select
  metadata->>'tool' as tool,
  count(*)::bigint as opens
from public.app_logs
where event_name = 'tool.opened'
  and metadata ? 'tool'
group by 1
order by opens desc;
