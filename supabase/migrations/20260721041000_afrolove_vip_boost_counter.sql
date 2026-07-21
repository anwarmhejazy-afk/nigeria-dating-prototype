-- AfroLove Phase 7.1 repair:
-- Count VIP boosts from profile_boosts for the current calendar month.

create or replace function public.get_membership_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan text;
  v_plan_row public.membership_plans%rowtype;
  v_subscription public.member_subscriptions%rowtype;
  v_usage public.member_usage_daily%rowtype;
  v_incoming_count integer := 0;
  v_weekly_super_likes integer := 0;
  v_monthly_boosts integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_plan := public.current_membership_plan(v_user_id);

  select *
  into v_plan_row
  from public.membership_plans
  where slug = v_plan;

  select *
  into v_subscription
  from public.member_subscriptions
  where user_id = v_user_id
    and status in ('pending', 'trialing', 'active', 'past_due')
  order by updated_at desc
  limit 1;

  select *
  into v_usage
  from public.member_usage_daily
  where user_id = v_user_id
    and usage_date = current_date;

  select coalesce(sum(super_likes_count), 0)::integer
  into v_weekly_super_likes
  from public.member_usage_daily
  where user_id = v_user_id
    and usage_date >= current_date - 6;

  select count(*)::integer
  into v_monthly_boosts
  from public.profile_boosts
  where user_id = v_user_id
    and created_at >= date_trunc('month', now())
    and created_at < date_trunc('month', now()) + interval '1 month';

  select count(*)::integer
  into v_incoming_count
  from public.interactions i
  where i.target_id = v_user_id
    and i.action in ('like', 'super_like')
    and not exists (
      select 1
      from public.matches m
      where m.is_active = true
        and least(m.user_low, m.user_high) =
            least(v_user_id, i.actor_id)
        and greatest(m.user_low, m.user_high) =
            greatest(v_user_id, i.actor_id)
    );

  return jsonb_build_object(
    'plan', v_plan,
    'planName', coalesce(v_plan_row.name, 'Free'),
    'status', coalesce(v_subscription.status, 'active'),
    'currency', coalesce(v_plan_row.currency, 'NGN'),
    'monthlyPriceMinor',
      coalesce(v_plan_row.monthly_price_minor, 0),
    'currentPeriodEnd', v_subscription.current_period_end,
    'cancelAtPeriodEnd',
      coalesce(v_subscription.cancel_at_period_end, false),
    'isTest', coalesce(v_subscription.is_test, true),
    'features', coalesce(v_plan_row.features, '{}'::jsonb),
    'usage', jsonb_build_object(
      'likesToday', coalesce(v_usage.likes_count, 0),
      'superLikesThisWeek', v_weekly_super_likes,
      'rewindsToday', coalesce(v_usage.rewinds_count, 0),
      'boostsThisMonth', v_monthly_boosts
    ),
    'incomingLikeCount', v_incoming_count
  );
end;
$$;

revoke all
on function public.get_membership_snapshot()
from public;

grant execute
on function public.get_membership_snapshot()
to authenticated;
