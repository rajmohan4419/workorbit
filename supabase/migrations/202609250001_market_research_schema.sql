-- OrbitBoard Market Research schema v0.1
-- PostgreSQL / Supabase
-- Purpose: provenance-aware market research, events, news and reproducible experiments.
-- No broker execution, recommendations or portfolio tables are included.

create extension if not exists pgcrypto;

create type public.market_security_type as enum (
  'equity',
  'index',
  'etf',
  'mutual_fund',
  'other'
);

create type public.market_event_type as enum (
  'earnings',
  'order',
  'acquisition',
  'merger',
  'management_change',
  'dividend',
  'split',
  'bonus',
  'buyback',
  'regulatory',
  'guidance',
  'investor_presentation',
  'corporate_action',
  'other'
);

create type public.market_source_type as enum (
  'market_data',
  'exchange',
  'company',
  'news',
  'mutual_fund',
  'research',
  'other'
);

create type public.market_data_frequency as enum (
  'tick',
  '1m',
  '5m',
  '15m',
  '30m',
  '1h',
  '1d'
);

create type public.experiment_status as enum (
  'draft',
  'queued',
  'running',
  'completed',
  'failed'
);

create type public.experiment_outcome as enum (
  'positive',
  'negative',
  'flat',
  'unknown'
);

create table public.market_data_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_type public.market_source_type not null,
  base_url text,
  terms_url text,
  license_name text,
  attribution_required boolean not null default false,
  redistribution_allowed boolean not null default false,
  commercial_use_allowed boolean not null default false,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.market_securities (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  exchange text,
  isin text,
  name text not null,
  security_type public.market_security_type not null,
  sector text,
  industry text,
  currency text not null default 'INR',
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_securities_symbol_exchange_unique unique (symbol, exchange)
);

create index market_securities_symbol_idx
  on public.market_securities (symbol);

create table public.market_observations (
  id bigint generated always as identity primary key,
  security_id uuid not null references public.market_securities(id) on delete cascade,
  source_id uuid not null references public.market_data_sources(id),
  observed_at timestamptz not null,
  frequency public.market_data_frequency not null,
  open numeric(20,6),
  high numeric(20,6),
  low numeric(20,6),
  close numeric(20,6),
  volume numeric(30,6),
  open_interest numeric(30,6),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint market_observations_ohlc_valid
    check (
      (open is null or open >= 0) and
      (high is null or high >= 0) and
      (low is null or low >= 0) and
      (close is null or close >= 0) and
      (high is null or low is null or high >= low)
    )
);

create index market_observations_security_time_idx
  on public.market_observations (security_id, observed_at desc);

create index market_observations_source_time_idx
  on public.market_observations (source_id, observed_at desc);

create table public.market_events (
  id uuid primary key default gen_random_uuid(),
  security_id uuid references public.market_securities(id) on delete set null,
  source_id uuid not null references public.market_data_sources(id),
  event_type public.market_event_type not null,
  title text not null,
  description text,
  event_timestamp timestamptz not null,
  source_url text,
  importance numeric(5,4),
  confidence numeric(5,4),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_events_importance_range check (importance is null or importance between 0 and 1),
  constraint market_events_confidence_range check (confidence is null or confidence between 0 and 1)
);

create index market_events_security_time_idx
  on public.market_events (security_id, event_timestamp desc);

create index market_events_type_time_idx
  on public.market_events (event_type, event_timestamp desc);

create table public.market_news_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.market_data_sources(id),
  publisher text not null,
  headline text not null,
  summary text,
  url text not null,
  published_at timestamptz not null,
  content_hash text,
  language text default 'en',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint market_news_items_url_unique unique (url)
);

create index market_news_items_published_idx
  on public.market_news_items (published_at desc);

create index market_news_items_hash_idx
  on public.market_news_items (content_hash);

create table public.market_event_news (
  event_id uuid not null references public.market_events(id) on delete cascade,
  news_id uuid not null references public.market_news_items(id) on delete cascade,
  relationship text not null default 'related',
  primary key (event_id, news_id)
);

create table public.market_event_securities (
  event_id uuid not null references public.market_events(id) on delete cascade,
  security_id uuid not null references public.market_securities(id) on delete cascade,
  relationship text not null default 'related',
  primary key (event_id, security_id)
);

create table public.market_experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  universe jsonb not null default '{}'::jsonb,
  definition jsonb not null,
  forward_windows integer[] not null default '{1,5,20}',
  benchmark_security_id uuid references public.market_securities(id) on delete set null,
  period_start date,
  period_end date,
  status public.experiment_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_experiments_forward_windows_valid
    check (
      cardinality(forward_windows) > 0 and
      0 < all(forward_windows)
    )
);

create index market_experiments_user_created_idx
  on public.market_experiments (user_id, created_at desc);

create table public.market_experiment_runs (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.market_experiments(id) on delete cascade,
  run_version integer not null,
  data_snapshot jsonb not null default '{}'::jsonb,
  methodology jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  observation_count integer not null default 0,
  control_count integer not null default 0,
  status public.experiment_status not null default 'queued',
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  constraint market_experiment_runs_version_unique unique (experiment_id, run_version),
  constraint market_experiment_runs_counts_valid check (observation_count >= 0 and control_count >= 0)
);

create index market_experiment_runs_experiment_created_idx
  on public.market_experiment_runs (experiment_id, created_at desc);

create table public.market_experiment_observations (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.market_experiment_runs(id) on delete cascade,
  security_id uuid not null references public.market_securities(id) on delete cascade,
  trigger_timestamp timestamptz not null,
  trigger_value jsonb not null default '{}'::jsonb,
  forward_timestamp timestamptz,
  forward_return numeric(20,10),
  benchmark_return numeric(20,10),
  excess_return numeric(20,10),
  outcome public.experiment_outcome not null default 'unknown',
  metadata jsonb not null default '{}'::jsonb
);

create index market_experiment_observations_run_idx
  on public.market_experiment_observations (run_id, trigger_timestamp);

create index market_experiment_observations_security_idx
  on public.market_experiment_observations (security_id, trigger_timestamp desc);

create table public.market_experiment_controls (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.market_experiment_runs(id) on delete cascade,
  security_id uuid not null references public.market_securities(id) on delete cascade,
  trigger_timestamp timestamptz not null,
  trigger_value jsonb not null default '{}'::jsonb,
  forward_timestamp timestamptz,
  forward_return numeric(20,10),
  benchmark_return numeric(20,10),
  excess_return numeric(20,10),
  outcome public.experiment_outcome not null default 'unknown',
  metadata jsonb not null default '{}'::jsonb
);

create index market_experiment_controls_run_idx
  on public.market_experiment_controls (run_id, trigger_timestamp);

-- Updated-at helper. Kept local to this schema migration.
create or replace function public.market_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger market_data_sources_updated_at
before update on public.market_data_sources
for each row execute function public.market_set_updated_at();

create trigger market_securities_updated_at
before update on public.market_securities
for each row execute function public.market_set_updated_at();

create trigger market_events_updated_at
before update on public.market_events
for each row execute function public.market_set_updated_at();

create trigger market_experiments_updated_at
before update on public.market_experiments
for each row execute function public.market_set_updated_at();

-- RLS: source/security/market-data/news are application-readable;
-- experiments are private to their owner. Service-role ingestion can bypass RLS.
alter table public.market_data_sources enable row level security;
alter table public.market_securities enable row level security;
alter table public.market_observations enable row level security;
alter table public.market_events enable row level security;
alter table public.market_news_items enable row level security;
alter table public.market_event_news enable row level security;
alter table public.market_event_securities enable row level security;
alter table public.market_experiments enable row level security;
alter table public.market_experiment_runs enable row level security;
alter table public.market_experiment_observations enable row level security;
alter table public.market_experiment_controls enable row level security;

create policy "market sources readable"
on public.market_data_sources for select
to anon, authenticated
using (active = true);

create policy "market securities readable"
on public.market_securities for select
to anon, authenticated
using (true);

create policy "market observations readable"
on public.market_observations for select
to anon, authenticated
using (true);

create policy "market events readable"
on public.market_events for select
to anon, authenticated
using (true);

create policy "market news readable"
on public.market_news_items for select
to anon, authenticated
using (true);

create policy "market event news readable"
on public.market_event_news for select
to anon, authenticated
using (true);

create policy "market event securities readable"
on public.market_event_securities for select
to anon, authenticated
using (true);

create policy "users read own experiments"
on public.market_experiments for select
to authenticated
using (auth.uid() = user_id);

create policy "users create own experiments"
on public.market_experiments for insert
to authenticated
with check (auth.uid() = user_id);

create policy "users update own experiments"
on public.market_experiments for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users delete own experiments"
on public.market_experiments for delete
to authenticated
using (auth.uid() = user_id);

create policy "users read own experiment runs"
on public.market_experiment_runs for select
to authenticated
using (
  exists (
    select 1
    from public.market_experiments e
    where e.id = experiment_id
      and e.user_id = auth.uid()
  )
);

create policy "users read own experiment observations"
on public.market_experiment_observations for select
to authenticated
using (
  exists (
    select 1
    from public.market_experiment_runs r
    join public.market_experiments e on e.id = r.experiment_id
    where r.id = run_id
      and e.user_id = auth.uid()
  )
);

create policy "users read own experiment controls"
on public.market_experiment_controls for select
to authenticated
using (
  exists (
    select 1
    from public.market_experiment_runs r
    join public.market_experiments e on e.id = r.experiment_id
    where r.id = run_id
      and e.user_id = auth.uid()
  )
);
