-- Extend the existing allowlist while preserving stored greetings and role grants.
alter table public.moment_shares
  drop constraint moment_shares_slug_check,
  add constraint moment_shares_slug_check
    check (slug in ('diwali', 'birthday', 'anniversary', 'announcement', 'celebrations', 'chhath-puja', 'christmas'));
