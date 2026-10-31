-- OrbitBoard hybrid monetization foundation.
-- Subscription and usage writes are server-only; users can read only their own rows.
create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null check (plan_code in ('pro_monthly','pro_annual','business_monthly','business_annual')),
  razorpay_subscription_id text unique,
  razorpay_plan_id text,
  status text not null default 'created' check (status in ('created','authenticated','active','pending','halted','paused','cancelled','completed','expired','failed')),
  current_period_start timestamptz, current_period_end timestamptz, next_charge_at timestamptz,
  cancel_at_period_end boolean not null default false, cancelled_at timestamptz,
  notes jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists user_subscriptions_user_status_idx on public.user_subscriptions (user_id,status,current_period_end desc);
create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_key text not null, period_start date not null,
  units_used integer not null default 0 check (units_used >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id,feature_key,period_start)
);
create index if not exists usage_counters_user_period_idx on public.usage_counters (user_id,period_start desc);
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_key text not null, units integer not null check (units > 0),
  source text not null, idempotency_key text, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists usage_events_idempotency_idx on public.usage_events (user_id,idempotency_key) where idempotency_key is not null;
create index if not exists usage_events_user_created_idx on public.usage_events (user_id,created_at desc);
alter table public.payment_orders
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists purchase_type text not null default 'one_time'
    check (purchase_type in ('one_time','subscription_initial','subscription_renewal')),
  add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.user_subscriptions enable row level security;
alter table public.usage_counters enable row level security;
alter table public.usage_events enable row level security;
revoke all on public.user_subscriptions from anon,authenticated;
revoke all on public.usage_counters from anon,authenticated;
revoke all on public.usage_events from anon,authenticated;
create policy "Users can read their own subscriptions" on public.user_subscriptions for select to authenticated using (auth.uid() = user_id);
create policy "Users can read their own usage counters" on public.usage_counters for select to authenticated using (auth.uid() = user_id);
create policy "Users can read their own usage events" on public.usage_events for select to authenticated using (auth.uid() = user_id);
-- Server-resolved quota is passed to this atomic, service-role-only operation.
create or replace function public.consume_feature_usage(
  p_user_id uuid,p_feature_key text,p_period_start date,p_units integer,p_limit integer,
  p_source text,p_idempotency_key text default null,p_metadata jsonb default '{}'::jsonb
) returns table (allowed boolean,units_used integer)
language plpgsql security definer set search_path = public
as $$
declare v_used integer; v_existing_id uuid;
begin
  if p_units is null or p_units <= 0 then raise exception 'p_units must be greater than zero'; end if;
  if p_limit is null or p_limit < -1 then raise exception 'p_limit must be -1 (unlimited) or non-negative'; end if;
  if p_idempotency_key is not null then
    select id into v_existing_id from public.usage_events
      where user_id=p_user_id and idempotency_key=p_idempotency_key;
    if v_existing_id is not null then
      select coalesce(units_used,0) into v_used from public.usage_counters
        where user_id=p_user_id and feature_key=p_feature_key and period_start=p_period_start;
      return query select true,coalesce(v_used,0); return;
    end if;
  end if;
  insert into public.usage_counters (user_id,feature_key,period_start,units_used)
    select p_user_id,p_feature_key,p_period_start,p_units
    where p_limit = -1 or p_units <= p_limit
    on conflict (user_id,feature_key,period_start) do update set
      units_used=public.usage_counters.units_used + excluded.units_used,updated_at=now()
    where p_limit = -1 or public.usage_counters.units_used + excluded.units_used <= p_limit
    returning usage_counters.units_used into v_used;
  if v_used is null then
    return query select false,coalesce((select units_used from public.usage_counters
      where user_id=p_user_id and feature_key=p_feature_key and period_start=p_period_start),0);
    return;
  end if;
  insert into public.usage_events (user_id,feature_key,units,source,idempotency_key,metadata)
    values (p_user_id,p_feature_key,p_units,p_source,p_idempotency_key,coalesce(p_metadata,'{}'::jsonb));
  return query select true,v_used;
exception when unique_violation then
  select coalesce(units_used,0) into v_used from public.usage_counters
    where user_id=p_user_id and feature_key=p_feature_key and period_start=p_period_start;
  return query select true,coalesce(v_used,0);
end;
$$;
revoke all on function public.consume_feature_usage(uuid,text,date,integer,integer,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.consume_feature_usage(uuid,text,date,integer,integer,text,text,jsonb) to service_role;
