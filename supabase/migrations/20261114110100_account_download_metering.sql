-- Isolated account-download metering. Does not migrate payments or subscriptions.
create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_key text not null,
  period_start date not null,
  units_used integer not null default 0 check (units_used >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, feature_key, period_start)
);
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_key text not null,
  units integer not null check (units > 0),
  source text not null,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists usage_events_idempotency_idx on public.usage_events (user_id, idempotency_key) where idempotency_key is not null;
create index if not exists usage_events_user_created_idx on public.usage_events (user_id, created_at desc);
alter table public.usage_counters enable row level security;
alter table public.usage_events enable row level security;
revoke all on public.usage_counters, public.usage_events from public, anon, authenticated;
grant select on public.usage_counters, public.usage_events to authenticated;
grant select, insert, update, delete on public.usage_counters, public.usage_events to service_role;
create policy download_counter_owner_read on public.usage_counters for select to authenticated using ((select auth.uid()) = user_id);
create policy download_event_owner_read on public.usage_events for select to authenticated using ((select auth.uid()) = user_id);

-- Service role already has table access and bypasses RLS. No SECURITY DEFINER needed.
create or replace function public.record_document_download(p_user_id uuid, p_request_id uuid, p_format text, p_tool_slug text)
returns table (allowed boolean, units_used integer, meter_period date)
language plpgsql security invoker set search_path = ''
as $$
declare
  v_period date := date_trunc('month', now() at time zone 'UTC')::date;
  v_key text := 'document-download:' || p_request_id::text;
  v_used integer;
  v_exists boolean;
begin
  if p_user_id is null or p_request_id is null or p_format not in ('pdf', 'xlsx') or p_format is null then
    raise exception 'Invalid document download';
  end if;
  if p_tool_slug is null or p_tool_slug !~ '^[a-z0-9-]{1,80}$' then raise exception 'Invalid tool identifier'; end if;
  -- Serialize same-account retries and concurrent tabs before checking idempotency.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text || ':document-download', 0));
  select exists(select 1 from public.usage_events e where e.user_id = p_user_id and e.idempotency_key = v_key) into v_exists;
  if v_exists then
    select c.units_used into v_used from public.usage_counters c where c.user_id = p_user_id and c.feature_key = 'document_download' and c.period_start = v_period;
    return query select true, coalesce(v_used, 0), v_period;
    return;
  end if;
  insert into public.usage_events (user_id, feature_key, units, source, idempotency_key, metadata)
  values (p_user_id, 'document_download', 1, p_tool_slug, v_key, jsonb_build_object('format', p_format));
  insert into public.usage_counters (user_id, feature_key, period_start, units_used)
  values (p_user_id, 'document_download', v_period, 1)
  on conflict (user_id, feature_key, period_start) do update
    set units_used = public.usage_counters.units_used + 1, updated_at = now()
  returning public.usage_counters.units_used into v_used;
  return query select true, v_used, v_period;
end;
$$;
revoke all on function public.record_document_download(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_document_download(uuid, uuid, text, text) to service_role;
