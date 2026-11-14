-- Run against a database with at least one test account. All test writes roll back.
begin;
do $$ declare v_user uuid; begin
  select id into v_user from auth.users limit 1;
  if v_user is null then raise exception 'A test account is required'; end if;
  perform set_config('orbit.test_user', v_user::text, true);
end $$;
set local role service_role;
do $$
declare
  v_user uuid := current_setting('orbit.test_user')::uuid;
  v_request uuid := gen_random_uuid();
  v_before integer;
  v_first record;
  v_retry record;
  v_second record;
begin
  select coalesce((select c.units_used from public.usage_counters c
    where c.user_id=v_user and c.feature_key='document_download'
      and c.period_start=date_trunc('month', now() at time zone 'UTC')::date), 0) into v_before;
  select * into v_first from public.record_document_download(v_user, v_request, 'pdf', 'gst-invoice-generator');
  select * into v_retry from public.record_document_download(v_user, v_request, 'pdf', 'gst-invoice-generator');
  select * into v_second from public.record_document_download(v_user, gen_random_uuid(), 'xlsx', 'bank-reconciliation');
  if not v_first.allowed or v_first.units_used <> v_before+1
    or v_retry.units_used <> v_first.units_used or v_second.units_used <> v_before+2
  then raise exception 'Counter/idempotency check failed'; end if;
end $$;
reset role;
do $$ begin
  if has_function_privilege('anon', 'public.record_document_download(uuid,uuid,text,text)', 'execute')
    or has_function_privilege('authenticated', 'public.record_document_download(uuid,uuid,text,text)', 'execute')
    or has_table_privilege('authenticated', 'public.usage_events', 'insert')
    or has_table_privilege('anon', 'public.usage_counters', 'select')
  then raise exception 'Metering permissions are too broad'; end if;
end $$;
rollback;
