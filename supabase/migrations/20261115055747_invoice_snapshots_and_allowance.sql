-- Additive invoice launch policy. No prices, subscriptions or payment products changed.
create table public.invoice_policy (
 tier text primary key check(tier in ('free','pro','business')),
 finalization_limit integer check(finalization_limit>=0),
 reset_policy text not null default 'lifetime' check(reset_policy in ('lifetime','monthly'))
);
insert into public.invoice_policy values('free',5,'lifetime'),('pro',null,'lifetime'),('business',null,'lifetime');
create table public.invoice_preferences (
 user_id uuid not null references auth.users(id),invoice_type text not null check(invoice_type in ('b2b','b2c','export')),
 template text not null check(template in ('modern','ledger','compact','commercial','shipping')),updated_at timestamptz not null default now(),
 primary key(user_id,invoice_type)
);
create table public.invoice_usage (
 user_id uuid not null references auth.users(id),period text not null,used integer not null default 0 check(used>=0),primary key(user_id,period)
);
create table public.invoice_snapshots (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),request_id uuid not null,
 fingerprint text not null,seller_gstin text not null,financial_year integer not null,invoice_number text not null,
 invoice_type text not null,snapshot jsonb not null,pdf_base64 text not null,created_at timestamptz not null default now(),
 unique(user_id,request_id),unique(seller_gstin,financial_year,invoice_number),
 check(length(invoice_number) between 1 and 16 and invoice_number ~ '^[A-Za-z0-9/-]+$'),
 check(length(pdf_base64) between 1 and 4194304)
);
create unique index invoice_number_case_unique on public.invoice_snapshots(seller_gstin,financial_year,upper(invoice_number));
create index invoice_history_owner on public.invoice_snapshots(user_id,created_at desc);
create table public.invoice_audit (
 id bigint generated always as identity primary key,invoice_id uuid not null references public.invoice_snapshots(id),user_id uuid not null references auth.users(id),event text not null check(event in ('finalized','downloaded')),created_at timestamptz not null default now()
);
alter table public.invoice_policy enable row level security;
alter table public.invoice_preferences enable row level security;
alter table public.invoice_usage enable row level security;
alter table public.invoice_snapshots enable row level security;
alter table public.invoice_audit enable row level security;
revoke all on public.invoice_policy,public.invoice_preferences,public.invoice_usage,public.invoice_snapshots,public.invoice_audit from public,anon,authenticated;
grant select on public.invoice_preferences,public.invoice_usage,public.invoice_snapshots,public.invoice_audit to authenticated;
grant insert,update on public.invoice_preferences to authenticated;
grant select,insert,update on public.invoice_policy,public.invoice_preferences,public.invoice_usage to service_role;
grant select,insert on public.invoice_snapshots,public.invoice_audit to service_role;
grant usage,select on sequence public.invoice_audit_id_seq to service_role;
create policy invoice_pref_owner on public.invoice_preferences for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy invoice_usage_owner on public.invoice_usage for select to authenticated using(user_id=(select auth.uid()));
create policy invoice_snapshot_owner on public.invoice_snapshots for select to authenticated using(user_id=(select auth.uid()));
create policy invoice_audit_owner on public.invoice_audit for select to authenticated using(user_id=(select auth.uid()));
-- Service-only RPC: validated PDF has already been generated. Debit, immutable
-- snapshot and audit event commit together. Every request for a user shares a lock.
create function public.finalize_invoice(p_user uuid,p_request uuid,p_fingerprint text,p_snapshot jsonb,p_pdf text)
returns public.invoice_snapshots language plpgsql security invoker set search_path='' as $$
declare v_existing public.invoice_snapshots%rowtype;v_tier text:='free';v_policy public.invoice_policy%rowtype;v_period text;v_used integer;v_code text;v_date date;
begin
 if p_user is null or p_request is null then raise exception 'Authentication required';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text||':invoice',0));
 select * into v_existing from public.invoice_snapshots where user_id=p_user and request_id=p_request;
 if found then
   if v_existing.fingerprint<>p_fingerprint then raise exception 'Idempotency conflict: create a new draft to change a finalized invoice';end if;
   return v_existing;
 end if;
 select plan_code into v_code from public.user_subscriptions where user_id=p_user and status='active' and current_period_end>now() order by current_period_end desc limit 1;
 if v_code like 'business\_%' escape '\' then v_tier:='business';elsif v_code like 'pro\_%' escape '\' then v_tier:='pro';end if;
 select * into strict v_policy from public.invoice_policy where tier=v_tier;
 v_period:=case when v_policy.reset_policy='monthly' then to_char(now() at time zone 'Asia/Kolkata','YYYY-MM') else 'lifetime' end;
 insert into public.invoice_usage(user_id,period) values(p_user,v_period) on conflict do nothing;
 select used into v_used from public.invoice_usage where user_id=p_user and period=v_period for update;
 if v_policy.finalization_limit is not null and v_used>=v_policy.finalization_limit then raise exception 'invoice_allowance_exhausted';end if;
 v_date:=(p_snapshot->'meta'->>'invoiceDate')::date;
 insert into public.invoice_snapshots(user_id,request_id,fingerprint,seller_gstin,financial_year,invoice_number,invoice_type,snapshot,pdf_base64)
 values(p_user,p_request,p_fingerprint,p_snapshot->'seller'->>'gstin',extract(year from v_date)::integer-case when extract(month from v_date)<4 then 1 else 0 end,p_snapshot->'meta'->>'invoiceNumber',p_snapshot->>'type',p_snapshot,p_pdf) returning * into v_existing;
 update public.invoice_usage set used=used+1 where user_id=p_user and period=v_period;
 insert into public.invoice_audit(invoice_id,user_id,event) values(v_existing.id,p_user,'finalized');
 return v_existing;
end;$$;
revoke all on function public.finalize_invoice(uuid,uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.finalize_invoice(uuid,uuid,text,jsonb,text) to service_role;
