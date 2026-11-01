-- Business Profile foundation. Apply only after reviewing existing schema.
create table public.business_profiles (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(trim(name)) between 2 and 160),
 business_type text not null default 'other' check (business_type in ('proprietorship','partnership','llp','private_limited','public_limited','other')),
 gstin text check (gstin is null or gstin ~ '^[0-9]{2}[A-Z0-9]{13}$'),
 state_code text, address text, upi_id text,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.business_members (
 business_id uuid not null references public.business_profiles(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('owner','admin','accountant','staff')),
 created_at timestamptz not null default now(),
 primary key (business_id,user_id)
);
create index business_members_user_idx on public.business_members(user_id);
alter table public.business_profiles enable row level security;
alter table public.business_members enable row level security;
revoke all on public.business_profiles, public.business_members from public, anon, authenticated;
grant select on public.business_profiles, public.business_members to authenticated;
-- Security-definer lookup avoids recursive membership RLS.
create function public.is_business_member(p_business_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.business_members m where m.business_id=p_business_id and m.user_id=(select auth.uid())); $$;
revoke all on function public.is_business_member(uuid) from public,anon,authenticated;
grant execute on function public.is_business_member(uuid) to authenticated;
create policy business_profile_read on public.business_profiles for select to authenticated
using (public.is_business_member(id));
create policy business_member_read on public.business_members for select to authenticated
using (public.is_business_member(business_id));
-- Atomic creation ensures users cannot assign themselves to another business.
create function public.create_business_profile(p_name text,p_type text default 'other',p_gstin text default null,p_state_code text default null,p_address text default null,p_upi_id text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid; v_user uuid := auth.uid();
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 if p_name is null or length(trim(p_name)) not between 2 and 160 then raise exception 'Invalid business name'; end if;
 insert into public.business_profiles(name,business_type,gstin,state_code,address,upi_id,created_by)
 values(trim(p_name),p_type,nullif(upper(trim(p_gstin)),''),nullif(trim(p_state_code),''),nullif(trim(p_address),''),nullif(trim(p_upi_id),''),v_user)
 returning id into v_id;
 insert into public.business_members(business_id,user_id,role) values(v_id,v_user,'owner');
 return v_id;
end; $$;
revoke all on function public.create_business_profile(text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.create_business_profile(text,text,text,text,text,text) to authenticated;

-- Only trusted server roles may write membership directly; clients use the validated RPC.
revoke all on public.business_profiles, public.business_members from anon;
