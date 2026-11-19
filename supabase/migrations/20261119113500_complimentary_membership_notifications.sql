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

  /*
   * Customer-facing AfroLove notification.
   * This does not expose the admin's internal notes
   * or modify PayPal billing.
   */
  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    url,
    metadata
  )
  values (
    p_user_id,
    'system',
    format(
      'Complimentary %s membership granted',
      initcap(p_plan_slug)
    ),
    format(
      'You have received %s complimentary %s of %s membership. Reason: %s. Valid from %s until %s.',
      p_days,
      case
        when p_days = 1 then 'day'
        else 'days'
      end,
      initcap(p_plan_slug),
      v_reason,
      to_char(
        v_start at time zone 'UTC',
        'DD Mon YYYY'
      ),
      to_char(
        v_end at time zone 'UTC',
        'DD Mon YYYY'
      )
    ),
    '/premium',
    jsonb_build_object(
      'complimentary',
      true,

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
      v_end
    )
  );

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
