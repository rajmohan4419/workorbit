create table public.moment_shares (
  id uuid primary key,
  slug text not null check (slug in ('diwali', 'birthday', 'anniversary', 'announcement', 'celebrations')),
  sender text not null check (char_length(sender) <= 60),
  recipient text not null check (char_length(recipient) <= 60),
  text text not null check (char_length(text) <= 8000),
  language text not null check (language in ('en', 'kn', 'hi', 'ta', 'te', 'ml', 'mr', 'bn', 'gu', 'pa')),
  created_at timestamptz not null default now()
);

alter table public.moment_shares enable row level security;
revoke all on table public.moment_shares from public, anon, authenticated, service_role;
grant select, insert on table public.moment_shares to service_role;
