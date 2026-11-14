-- Repair the live entitlement read dependency without migrating payments or granting plans.
create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null check (plan_code in ('pro_monthly','pro_annual','business_monthly','business_annual')),
  razorpay_subscription_id text unique,
  razorpay_plan_id text,
  status text not null default 'created' check (status in ('created','authenticated','active','pending','halted','paused','cancelled','completed','expired','failed')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  next_charge_at timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  notes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists user_subscriptions_user_status_idx on public.user_subscriptions (user_id,status,current_period_end desc);
alter table public.user_subscriptions enable row level security;
revoke all on public.user_subscriptions from public, anon, authenticated;
grant select on public.user_subscriptions to authenticated;
grant select, insert, update, delete on public.user_subscriptions to service_role;
create policy subscription_owner_read on public.user_subscriptions for select to authenticated using ((select auth.uid()) = user_id);
notify pgrst, 'reload schema';
