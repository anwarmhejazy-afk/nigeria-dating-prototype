create table if not exists public.complimentary_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_slug text not null references public.membership_plans(slug),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  reason text not null,
  campaign_code text,
  granted_by uuid,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint complimentary_memberships_plan_check
    check (plan_slug in ('premium', 'vip')),

  constraint complimentary_memberships_dates_check
    check (ends_at > starts_at)
);

create index if not exists complimentary_memberships_user_idx
  on public.complimentary_memberships
  (user_id, starts_at, ends_at);

create index if not exists complimentary_memberships_active_idx
  on public.complimentary_memberships
  (ends_at desc)
  where revoked_at is null;

alter table public.complimentary_memberships
  enable row level security;

grant select
on public.complimentary_memberships
to authenticated;

drop policy if exists
  "Admins can view complimentary memberships"
on public.complimentary_memberships;

create policy
  "Admins can view complimentary memberships"
on public.complimentary_memberships
for select
to authenticated
using (public.is_afrolove_admin(auth.uid()));


create or replace function public.current_membership_plan(
  p_user_id uuid default auth.uid()
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select access.plan_slug
    from (
      select
        s.plan_slug,
        s.current_period_end as period_end,
        s.updated_at as sort_time
      from public.member_subscriptions s
      where s.user_id = p_user_id
        and s.status in ('trialing', 'active')
        and (
          s.current_period_end is null
          or s.current_period_end > now()
        )

      union all

      select
        c.plan_slug,
        c.ends_at as period_end,
        c.created_at as sort_time
      from public.complimentary_memberships c
      where c.user_id = p_user_id
        and c.revoked_at is null
        and c.starts_at <= now()
        and c.ends_at > now()
    ) access
    order by
      case access.plan_slug
        when 'vip' then 3
        when 'premium' then 2
        else 1
      end desc,
      coalesce(
        access.period_end,
        'infinity'::timestamptz
      ) desc,
      access.sort_time desc
    limit 1
  ), 'free');
$$;

grant execute
on function public.current_membership_plan(uuid)
to authenticated;


create or replace function public.get_membership_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();

  v_plan text := 'free';
  v_status text := 'active';
  v_period_end timestamptz;
  v_cancel_at_period_end boolean := false;
  v_is_test boolean := true;
  v_source text := 'free';

  v_plan_row public.membership_plans%rowtype;
  v_usage public.member_usage_daily%rowtype;

  v_incoming_count integer := 0;
  v_weekly_super_likes integer := 0;
  v_monthly_boosts integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  /*
   * Choose the highest active access available:
   * real/test subscription OR complimentary grant.
   */
  select
    access.plan_slug,
    access.status,
    access.period_end,
    access.cancel_at_period_end,
    access.is_test,
    access.source
  into
    v_plan,
    v_status,
    v_period_end,
    v_cancel_at_period_end,
    v_is_test,
    v_source
  from (
    select
      s.plan_slug,
      s.status,
      s.current_period_end as period_end,
      s.cancel_at_period_end,
      s.is_test,
      'subscription'::text as source,
      s.updated_at as sort_time
    from public.member_subscriptions s
    where s.user_id = v_user_id
      and s.status in (
        'trialing',
        'active'
      )
      and (
        s.current_period_end is null
        or s.current_period_end > now()
      )

    union all

    select
      c.plan_slug,
      'active'::text as status,
      c.ends_at as period_end,
      false as cancel_at_period_end,
      false as is_test,
      'complimentary'::text as source,
      c.created_at as sort_time
    from public.complimentary_memberships c
    where c.user_id = v_user_id
      and c.revoked_at is null
      and c.starts_at <= now()
      and c.ends_at > now()
  ) access
  order by
    case access.plan_slug
      when 'vip' then 3
      when 'premium' then 2
      else 1
    end desc,
    coalesce(
      access.period_end,
      'infinity'::timestamptz
    ) desc,
    access.sort_time desc
  limit 1;

  if v_plan is null then
    v_plan := 'free';
    v_status := 'active';
    v_period_end := null;
    v_cancel_at_period_end := false;
    v_is_test := true;
    v_source := 'free';
  end if;

  select *
  into v_plan_row
  from public.membership_plans
  where slug = v_plan;

  select *
  into v_usage
  from public.member_usage_daily
  where user_id = v_user_id
    and usage_date = current_date;

  select
    coalesce(
      sum(super_likes_count),
      0
    )::integer
  into v_weekly_super_likes
  from public.member_usage_daily
  where user_id = v_user_id
    and usage_date >= current_date - 6;

  /*
   * Preserve the newer VIP boost-counter logic.
   */
  select
    count(*)::integer
  into v_monthly_boosts
  from public.profile_boosts
  where user_id = v_user_id
    and created_at >=
      date_trunc(
        'month',
        now()
      )
    and created_at <
      date_trunc(
        'month',
        now()
      ) + interval '1 month';

  select
    count(*)::integer
  into v_incoming_count
  from public.interactions i
  where i.target_id = v_user_id
    and i.action in (
      'like',
      'super_like'
    )
    and not exists (
      select 1
      from public.matches m
      where m.is_active = true
        and least(
          m.user_low,
          m.user_high
        ) = least(
          v_user_id,
          i.actor_id
        )
        and greatest(
          m.user_low,
          m.user_high
        ) = greatest(
          v_user_id,
          i.actor_id
        )
    );

  return jsonb_build_object(
    'plan',
    v_plan,

    'planName',
    coalesce(
      v_plan_row.name,
      'Free'
    ),

    'status',
    v_status,

    'currency',
    coalesce(
      v_plan_row.currency,
      'NGN'
    ),

    'monthlyPriceMinor',
    coalesce(
      v_plan_row.monthly_price_minor,
      0
    ),

    'currentPeriodEnd',
    v_period_end,

    'cancelAtPeriodEnd',
    v_cancel_at_period_end,

    'isTest',
    v_is_test,

    'source',
    v_source,

    'isComplimentary',
    v_source = 'complimentary',

    'features',
    coalesce(
      v_plan_row.features,
      '{}'::jsonb
    ),

    'usage',
    jsonb_build_object(
      'likesToday',
      coalesce(
        v_usage.likes_count,
        0
      ),

      'superLikesThisWeek',
      v_weekly_super_likes,

      'rewindsToday',
      coalesce(
        v_usage.rewinds_count,
        0
      ),

      'boostsThisMonth',
      v_monthly_boosts
    ),

    'incomingLikeCount',
    v_incoming_count
  );
end;
$$;

grant execute
on function public.get_membership_snapshot()
to authenticated;


create or replace function public.admin_grant_complimentary_membership(
  p_user_id uuid,
  p_plan_slug text,
  p_days integer default 30,
  p_reason text default 'Promotion',
  p_campaign_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;

  v_profile_status text;
  v_verified boolean;

  v_start timestamptz := now();
  v_end timestamptz;

  v_existing_end timestamptz;

  v_paypal_subscription_id text;
  v_paypal_plan text;
  v_paypal_end timestamptz;

  v_paypal_action_required boolean := false;

  v_reason text :=
    left(
      btrim(
        coalesce(
          p_reason,
          ''
        )
      ),
      200
    );

  v_campaign text :=
    nullif(
      left(
        upper(
          btrim(
            coalesce(
              p_campaign_code,
              ''
            )
          )
        ),
        80
      ),
      ''
    );
begin
  if not public.is_afrolove_admin(
    auth.uid()
  ) then
    raise exception 'Admin access required';
  end if;

  if p_plan_slug not in (
    'premium',
    'vip'
  ) then
    raise exception
      'Complimentary plan must be Premium or VIP';
  end if;

  if p_days < 1
    or p_days > 365 then
    raise exception
      'Complimentary duration must be between 1 and 365 days';
  end if;

  if v_reason = '' then
    raise exception
      'A reason is required';
  end if;

  select
    p.account_status,
    p.is_verified
  into
    v_profile_status,
    v_verified
  from public.profiles p
  where p.id = p_user_id;

  if not found then
    raise exception
      'Member profile not found';
  end if;

  if coalesce(
    v_profile_status,
    ''
  ) in (
    'banned',
    'suspended',
    'deleted'
  ) then
    raise exception
      'Complimentary access cannot be granted to this account status';
  end if;

  /*
   * Stack another complimentary grant of
   * the same plan instead of overlapping it.
   */
  select max(c.ends_at)
  into v_existing_end
  from public.complimentary_memberships c
  where c.user_id = p_user_id
    and c.plan_slug = p_plan_slug
    and c.revoked_at is null
    and c.ends_at > now();

  if v_existing_end is not null
    and v_existing_end > v_start then
    v_start := v_existing_end;
  end if;

  /*
   * Detect a real PayPal subscription.
   *
   * If the member is already paying for the
   * same or a higher plan, schedule the
   * complimentary period after the current
   * paid period instead of overlapping it.
   *
   * This does NOT alter PayPal billing.
   */
  select
    s.provider_subscription_id,
    s.plan_slug,
    s.current_period_end
  into
    v_paypal_subscription_id,
    v_paypal_plan,
    v_paypal_end
  from public.member_subscriptions s
  where s.user_id = p_user_id
    and s.provider = 'paypal'
    and s.status in (
      'trialing',
      'active'
    )
    and (
      s.current_period_end is null
      or s.current_period_end > now()
    )
  order by
    case s.plan_slug
      when 'vip' then 3
      when 'premium' then 2
      else 1
    end desc,
    s.updated_at desc
  limit 1;

  if v_paypal_subscription_id
    is not null then

    v_paypal_action_required := true;

    if v_paypal_end is not null
      and (
        case v_paypal_plan
          when 'vip' then 3
          when 'premium' then 2
          else 1
        end
      ) >= (
        case p_plan_slug
          when 'vip' then 3
          when 'premium' then 2
          else 1
        end
      )
      and v_paypal_end > v_start then

      v_start := v_paypal_end;
    end if;
  end if;

  v_end :=
    v_start
    + make_interval(
      days => p_days
    );

  insert into public.complimentary_memberships (
    user_id,
    plan_slug,
    starts_at,
    ends_at,
    reason,
    campaign_code,
    granted_by,
    metadata
  )
  values (
    p_user_id,
    p_plan_slug,
    v_start,
    v_end,
    v_reason,
    v_campaign,
    auth.uid(),
    jsonb_build_object(
      'days',
      p_days,

      'verifiedAtGrant',
      coalesce(
        v_verified,
        false
      ),

      'accountStatusAtGrant',
      v_profile_status,

      'paypalBillingActionRequired',
      v_paypal_action_required,

      'paypalSubscriptionId',
      v_paypal_subscription_id
    )
  )
  returning id into v_id;

  insert into public.admin_audit_logs (
    admin_id,
    action,
    target_user_id,
    metadata
  )
  values (
    auth.uid(),
    'complimentary_membership_granted',
    p_user_id,
    jsonb_build_object(
      'complimentaryMembershipId',
      v_id,

      'plan',
      p_plan_slug,

      'days',
      p_days,

      'reason',
      v_reason,

      'campaign',
      v_campaign,

      'startsAt',
      v_start,

      'endsAt',
      v_end,

      'paypalBillingActionRequired',
      v_paypal_action_required,

      'paypalSubscriptionId',
      v_paypal_subscription_id
    )
  );

  return jsonb_build_object(
    'id',
    v_id,

    'plan',
    p_plan_slug,

    'days',
    p_days,

    'startsAt',
    v_start,

    'endsAt',
    v_end,

    'reason',
    v_reason,

    'campaign',
    v_campaign,

    'paypalBillingActionRequired',
    v_paypal_action_required,

    'paypalSubscriptionId',
    v_paypal_subscription_id
  );
end;
$$;

revoke all
on function public.admin_grant_complimentary_membership(
  uuid,
  text,
  integer,
  text,
  text
)
from public;

grant execute
on function public.admin_grant_complimentary_membership(
  uuid,
  text,
  integer,
  text,
  text
)
to authenticated;
