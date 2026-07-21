-- AfroLove Phase 7.1 repair:
-- Count showcase-profile rewinds during feature testing.
-- Real-member rewinds remain recorded by undo_interaction(uuid).

create or replace function public.record_rewind_usage()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan text;
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_plan := public.current_membership_plan(v_user_id);

  if v_plan = 'free' then
    raise exception 'Rewind requires Premium or VIP.';
  end if;

  insert into public.member_usage_daily (
    user_id,
    usage_date,
    rewinds_count
  )
  values (
    v_user_id,
    current_date,
    1
  )
  on conflict (user_id, usage_date)
  do update
  set
    rewinds_count =
      public.member_usage_daily.rewinds_count + 1,
    updated_at = now()
  returning rewinds_count into v_count;

  return coalesce(v_count, 1);
end;
$$;

revoke all
on function public.record_rewind_usage()
from public;

grant execute
on function public.record_rewind_usage()
to authenticated;
