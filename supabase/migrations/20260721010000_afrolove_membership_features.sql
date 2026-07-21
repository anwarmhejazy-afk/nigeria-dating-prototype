-- AfroLove Phase 7.1: membership feature completion.
-- Passed profiles recycle automatically, VIP members receive discovery priority,
-- and admins can tune the pass-recycle window without exposing private billing data.

alter table public.monetization_settings
  add column if not exists pass_recycle_hours integer not null default 24;

update public.monetization_settings
set pass_recycle_hours = greatest(1, least(coalesce(pass_recycle_hours, 24), 720))
where singleton = true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'monetization_settings_pass_recycle_hours_check'
      and conrelid = 'public.monetization_settings'::regclass
  ) then
    alter table public.monetization_settings
      add constraint monetization_settings_pass_recycle_hours_check
      check (pass_recycle_hours between 1 and 720);
  end if;
end;
$$;


create or replace function public.get_discovery_configuration()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'passRecycleHours',
    greatest(1, least(coalesce(pass_recycle_hours, 24), 720))
  )
  from public.monetization_settings
  where singleton = true
    and auth.uid() is not null;
$$;

revoke all on function public.get_discovery_configuration() from public;
grant execute on function public.get_discovery_configuration() to authenticated;

create or replace function public.get_discovery_entitlements(
  p_candidate_ids uuid[]
)
returns table (
  user_id uuid,
  plan_slug text,
  boosted boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id as user_id,
    public.current_membership_plan(p.id) as plan_slug,
    exists (
      select 1
      from public.profile_boosts b
      where b.user_id = p.id
        and b.starts_at <= now()
        and b.ends_at > now()
    ) as boosted
  from public.profiles p
  where auth.uid() is not null
    and p.id = any(coalesce(p_candidate_ids, '{}'::uuid[]))
    and not public.is_afrolove_admin(p.id);
$$;

revoke all on function public.get_discovery_entitlements(uuid[]) from public;
grant execute on function public.get_discovery_entitlements(uuid[]) to authenticated;

create or replace function public.expire_finished_memberships()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
begin
  update public.member_subscriptions
  set status = 'expired', updated_at = now()
  where status in ('trialing', 'active', 'past_due')
    and current_period_end is not null
    and current_period_end <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_finished_memberships() from public;
grant execute on function public.expire_finished_memberships() to authenticated;
