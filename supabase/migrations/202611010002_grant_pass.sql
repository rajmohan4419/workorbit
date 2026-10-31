-- Pass grants: atomic, idempotent entitlement grant for a verified pass payment.

-- Idempotency is keyed on the payment id alone, so the checkout callback and the
-- webhook cannot both grant for the same payment, whichever arrives first.
alter table public.entitlement_events
  drop constraint if exists entitlement_events_source_external_id_event_key;
alter table public.entitlement_events
  add constraint entitlement_events_external_event_key unique (external_id, event);

-- Returns true when this call granted access, false when the payment was already granted.
-- Subscription row and audit row are written in one transaction.
-- Stacking: a pass bought while access is active extends from the current horizon.
-- The plan's active flag is deliberately not checked, so a retried webhook still succeeds
-- after a plan is retired.
create or replace function public.grant_pass(
  p_user uuid,
  p_plan_id text,
  p_payment_id text,
  p_source text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer;
  v_horizon timestamptz;
  v_sub uuid;
begin
  select pass_days into v_days
  from public.plans
  where id = p_plan_id and kind = 'pass';

  if v_days is null then
    raise exception 'not a pass plan: %', p_plan_id;
  end if;

  begin
    select max(current_period_end) into v_horizon
    from public.subscriptions
    where user_id = p_user
      and status in ('active', 'cancelled', 'halted')
      and current_period_end > now();

    insert into public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
    values (
      p_user,
      p_plan_id,
      'active',
      now(),
      greatest(coalesce(v_horizon, now()), now()) + make_interval(days => v_days)
    )
    returning id into v_sub;

    insert into public.entitlement_events (user_id, subscription_id, event, source, external_id)
    values (p_user, v_sub, 'granted', p_source, p_payment_id);
  exception
    when unique_violation then
      return false;
  end;

  return true;
end;
$$;

revoke execute on function public.grant_pass(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.grant_pass(uuid, text, text, text) to service_role;
