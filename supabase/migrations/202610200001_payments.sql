-- Payments: server-side order records and captured payments.
-- Only the service role (server code) can read or write these tables.

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  razorpay_order_id text not null unique,
  product_id text not null,
  amount_paise integer not null check (amount_paise > 0),
  currency text not null check (currency in ('INR')),
  receipt text,
  status text not null default 'created' check (status in ('created', 'paid')),
  payment_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  razorpay_payment_id text primary key,
  razorpay_order_id text not null references public.payment_orders(razorpay_order_id),
  amount_paise integer not null check (amount_paise > 0),
  currency text not null check (currency in ('INR')),
  status text not null check (status in ('captured')),
  source text not null check (source in ('checkout', 'webhook')),
  created_at timestamptz not null default now()
);

create index if not exists payments_order_idx on public.payments (razorpay_order_id);

alter table public.payment_orders enable row level security;
alter table public.payments enable row level security;

revoke all on public.payment_orders from anon, authenticated;
revoke all on public.payments from anon, authenticated;
-- No policies are created: with RLS on and no grants, only the service role can access these tables.
