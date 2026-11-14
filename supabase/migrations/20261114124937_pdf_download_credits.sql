-- PDF-only prepaid units. Existing XLSX pilot and historical usage are unchanged.
create table public.pdf_credit_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  purchased bigint not null default 0 check (purchased >= 0),
  used bigint not null default 0 check (used >= 0 and used <= purchased),
  updated_at timestamptz not null default now()
);
create table public.pdf_credit_topups (
  order_id text primary key references public.payment_orders(razorpay_order_id),
  payment_id text not null unique references public.payments(razorpay_payment_id),
  user_id uuid not null references auth.users(id) on delete cascade,
  credits integer not null check (credits > 0),
  amount_paise integer not null check (amount_paise >= 10000 and amount_paise <= 10000000 and amount_paise % 25 = 0),
  created_at timestamptz not null default now(),
  check (credits * 25 = amount_paise)
);
create table public.pdf_download_charges (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  tool_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id,request_id)
);
create index pdf_credit_topups_owner_idx on public.pdf_credit_topups(user_id,created_at desc);
alter table public.pdf_credit_accounts enable row level security;
alter table public.pdf_credit_topups enable row level security;
alter table public.pdf_download_charges enable row level security;
revoke all on public.pdf_credit_accounts,public.pdf_credit_topups,public.pdf_download_charges from public,anon,authenticated;
grant select on public.pdf_credit_accounts,public.pdf_credit_topups,public.pdf_download_charges to authenticated;
grant select,insert,update,delete on public.pdf_credit_accounts,public.pdf_credit_topups,public.pdf_download_charges to service_role;
create policy pdf_account_owner on public.pdf_credit_accounts for select to authenticated using ((select auth.uid())=user_id);
create policy pdf_topup_owner on public.pdf_credit_topups for select to authenticated using ((select auth.uid())=user_id);
create policy pdf_charge_owner on public.pdf_download_charges for select to authenticated using ((select auth.uid())=user_id);

create function public.grant_pdf_topup(p_order_id text,p_payment_id text)
returns void language plpgsql security invoker set search_path='' as $$
declare v_order public.payment_orders%rowtype; v_credits integer;
begin
  select * into v_order from public.payment_orders where razorpay_order_id=p_order_id;
  if not found or v_order.product_id <> 'pdf-download-topup' or v_order.user_id is null or v_order.currency <> 'INR'
     or v_order.amount_paise < 10000 or v_order.amount_paise > 10000000 or v_order.amount_paise % 25 <> 0 then
    raise exception 'Invalid PDF top-up order';
  end if;
  if not exists(select 1 from public.payments p where p.razorpay_payment_id=p_payment_id and p.razorpay_order_id=p_order_id
     and p.status='captured' and p.currency='INR' and p.amount_paise=v_order.amount_paise) then raise exception 'Captured payment required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_order.user_id::text || ':pdf-credit',0));
  if exists(select 1 from public.pdf_credit_topups where order_id=p_order_id) then return; end if;
  v_credits := v_order.amount_paise / 25;
  insert into public.pdf_credit_topups(order_id,payment_id,user_id,credits,amount_paise) values(p_order_id,p_payment_id,v_order.user_id,v_credits,v_order.amount_paise);
  insert into public.pdf_credit_accounts(user_id,purchased) values(v_order.user_id,v_credits)
    on conflict(user_id) do update set purchased=public.pdf_credit_accounts.purchased+excluded.purchased,updated_at=now();
end; $$;
revoke all on function public.grant_pdf_topup(text,text) from public,anon,authenticated;
grant execute on function public.grant_pdf_topup(text,text) to service_role;

create function public.charge_pdf_download(p_user_id uuid,p_request_id uuid,p_format text,p_tool_slug text)
returns table(allowed boolean,units_used integer,meter_period date,remaining bigint)
language plpgsql security invoker set search_path='' as $$
declare v_account public.pdf_credit_accounts%rowtype; v_usage record;
begin
  if p_user_id is null or p_request_id is null or p_format is distinct from 'pdf' or p_tool_slug is null or p_tool_slug !~ '^[a-z0-9-]{1,80}$' then raise exception 'Invalid PDF download'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text || ':pdf-credit',0));
  select * into v_account from public.pdf_credit_accounts where user_id=p_user_id;
  if exists(select 1 from public.pdf_download_charges c where c.user_id=p_user_id and c.request_id=p_request_id and c.tool_slug<>p_tool_slug) then raise exception 'Download request mismatch'; end if;
  if exists(select 1 from public.pdf_download_charges c where c.user_id=p_user_id and c.request_id=p_request_id) then
    return query select true,0,date_trunc('month',now() at time zone 'UTC')::date,v_account.purchased-v_account.used; return;
  end if;
  if v_account.user_id is null or v_account.purchased<=v_account.used then
    return query select false,0,date_trunc('month',now() at time zone 'UTC')::date,0::bigint; return;
  end if;
  -- All usage recording and the debit commit together, or neither commits.
  select * into v_usage from public.record_document_download(p_user_id,p_request_id,'pdf',p_tool_slug);
  if not v_usage.allowed then raise exception 'Usage recording failed'; end if;
  insert into public.pdf_download_charges(user_id,request_id,tool_slug) values(p_user_id,p_request_id,p_tool_slug);
  update public.pdf_credit_accounts set used=used+1,updated_at=now() where user_id=p_user_id;
  return query select true,v_usage.units_used,v_usage.meter_period,v_account.purchased-v_account.used-1;
end; $$;
revoke all on function public.charge_pdf_download(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.charge_pdf_download(uuid,uuid,text,text) to service_role;
