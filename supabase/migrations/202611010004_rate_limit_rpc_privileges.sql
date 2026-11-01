-- Production-safe privilege correction: rate limiting is called only by server service-role.
-- Existing anonymous telemetry RPCs are deliberately unchanged pending redesign.
revoke execute on function public.check_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer)
  to service_role;
