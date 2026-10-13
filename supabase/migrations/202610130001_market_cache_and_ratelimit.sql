-- =============================================
-- Migration: Market Cache & Atomic Rate Limiting
-- =============================================

-- 1. Create market_cache table
create table if not exists public.market_cache (
  key text primary key,
  value jsonb not null,
  expires_at timestamptz not null
);

-- Enable RLS and revoke client direct access
alter table public.market_cache enable row level security;
revoke all on public.market_cache from anon, authenticated;

-- Index for fast lookup and automated expiry cleanup
create index if not exists idx_market_cache_expires_at on public.market_cache (expires_at);

-- 2. Create rate_limit_buckets table for atomic rate limiting
create table if not exists public.rate_limit_buckets (
  key text primary key,
  request_count int not null default 1,
  window_start timestamptz not null default now()
);

alter table public.rate_limit_buckets enable row level security;
revoke all on public.rate_limit_buckets from anon, authenticated;

-- Index for cleaning up stale rate limit buckets
create index if not exists idx_rate_limit_buckets_window on public.rate_limit_buckets (window_start);

-- 3. Atomic Rate Limiting RPC function
create or replace function public.check_rate_limit(
  p_key text,
  p_limit int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_count int;
begin
  -- Delete stale buckets older than 1 hour periodically
  delete from public.rate_limit_buckets where window_start < v_now - interval '1 hour';

  -- Lock row or insert initial record atomically
  insert into public.rate_limit_buckets (key, request_count, window_start)
  values (p_key, 1, v_now)
  on conflict (key) do update
  set
    request_count = case
      when rate_limit_buckets.window_start < v_now - (p_window_seconds || ' seconds')::interval then 1
      else rate_limit_buckets.request_count + 1
    end,
    window_start = case
      when rate_limit_buckets.window_start < v_now - (p_window_seconds || ' seconds')::interval then v_now
      else rate_limit_buckets.window_start
    end
  returning request_count into v_count;

  -- Returns true if rate limit is exceeded
  return v_count > p_limit;
end;
$$;

-- Revoke function execution from anon/authenticated; server-side service role only
revoke execute on function public.check_rate_limit(text, int, int) from anon, authenticated;
