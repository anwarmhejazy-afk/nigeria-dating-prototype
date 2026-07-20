-- AfroLove Phase 7: memberships, usage limits, Flutterwave test checkout,
-- 50/50 split configuration, payment history and admin-controlled test access.

create table if not exists public.membership_plans (
  slug text primary key check (slug in ('free', 'premium', 'vip')),
  name text not null,
  description text not null,
  currency text not null default 'NGN',
  monthly_price_minor integer not null default 0 check (monthly_price_minor >= 0),
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.membership_plans (slug, name, description, currency, monthly_price_minor, features)
values
  ('free', 'Free', 'Meet genuine people with essential matching tools.', 'NGN', 0,
   '{"daily_like_limit":10,"weekly_super_like_limit":0,"rewind":false,"see_likes":false,"advanced_filters":false,"read_receipts":false,"monthly_boosts":0,"priority_discovery":false}'::jsonb),
  ('premium', 'Premium', 'Unlimited likes and serious matching tools.', 'NGN', 350000,
   '{"daily_like_limit":null,"weekly_super_like_limit":5,"rewind":true,"see_likes":true,"advanced_filters":true,"read_receipts":true,"monthly_boosts":0,"priority_discovery":false}'::jsonb),
  ('vip', 'VIP', 'Maximum visibility, premium tools and monthly boosts.', 'NGN', 750000,
   '{"daily_like_limit":null,"weekly_super_like_limit":10,"rewind":true,"see_likes":true,"advanced_filters":true,"read_receipts":true,"monthly_boosts":1,"priority_discovery":true}'::jsonb)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  currency = excluded.currency,
  monthly_price_minor = excluded.monthly_price_minor,
  features = excluded.features,
  updated_at = now();

create table if not exists public.monetization_settings (
  singleton boolean primary key default true check (singleton),
  flutterwave_test_mode boolean not null default true,
  checkout_enabled boolean not null default false,
  currency text not null default 'NGN',
  free_daily_like_limit integer not null default 10 check (free_daily_like_limit between 1 and 100),
  premium_price_minor integer not null default 350000 check (premium_price_minor >= 0),
  vip_price_minor integer not null default 750000 check (vip_price_minor >= 0),
  premium_payment_plan_id text,
  vip_payment_plan_id text,
  owner_subaccount_id text,
  partner_subaccount_id text,
  owner_split_ratio integer not null default 1 check (owner_split_ratio > 0),
  partner_split_ratio integer not null default 1 check (partner_split_ratio > 0),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.monetization_settings (singleton)
values (true)
on conflict (singleton) do nothing;

create table if not exists public.member_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_slug text not null references public.membership_plans(slug),
  status text not null default 'active'
    check (status in ('pending', 'trialing', 'active', 'past_due', 'cancelled', 'expired')),
  provider text not null default 'flutterwave',
  provider_subscription_id text,
  provider_plan_id text,
  customer_email text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  is_test boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists member_subscriptions_one_current_idx
on public.member_subscriptions (user_id)
where status in ('pending', 'trialing', 'active', 'past_due');

create index if not exists member_subscriptions_status_idx
on public.member_subscriptions (status, plan_slug, current_period_end desc);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id uuid references public.member_subscriptions(id) on delete set null,
  tx_ref text not null unique,
  provider_transaction_id text unique,
  plan_slug text not null references public.membership_plans(slug),
  amount_minor integer not null check (amount_minor >= 0),
  currency text not null,
  status text not null default 'initiated'
    check (status in ('initiated', 'pending', 'successful', 'failed', 'cancelled', 'refunded')),
  checkout_link text,
  split_snapshot jsonb not null default '{}'::jsonb,
  provider_payload jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_transactions_user_created_idx
on public.payment_transactions (user_id, created_at desc);

create index if not exists payment_transactions_status_idx
on public.payment_transactions (status, created_at desc);

create table if not exists public.member_usage_daily (
  user_id uuid not null references public.profiles(id) on delete cascade,
  usage_date date not null default current_date,
  likes_count integer not null default 0,
  super_likes_count integer not null default 0,
  rewinds_count integer not null default 0,
  boosts_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

create table if not exists public.profile_boosts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  source text not null default 'vip_monthly',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists profile_boosts_active_idx
on public.profile_boosts (user_id, ends_at desc);

alter table public.membership_plans enable row level security;
alter table public.monetization_settings enable row level security;
alter table public.member_subscriptions enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.member_usage_daily enable row level security;
alter table public.profile_boosts enable row level security;

drop policy if exists "Members can view active plans" on public.membership_plans;
create policy "Members can view active plans"
on public.membership_plans for select
to authenticated
using (is_active or (select public.is_afrolove_admin()));

drop policy if exists "Admins manage membership plans" on public.membership_plans;
create policy "Admins manage membership plans"
on public.membership_plans for update
to authenticated
using ((select public.is_afrolove_admin()))
with check ((select public.is_afrolove_admin()));

drop policy if exists "Admins manage monetization settings" on public.monetization_settings;
create policy "Admins manage monetization settings"
on public.monetization_settings for all
to authenticated
using ((select public.is_afrolove_admin()))
with check ((select public.is_afrolove_admin()));

drop policy if exists "Members view own subscriptions" on public.member_subscriptions;
create policy "Members view own subscriptions"
on public.member_subscriptions for select
to authenticated
using (user_id = (select auth.uid()) or (select public.is_afrolove_admin()));

drop policy if exists "Members view own payment history" on public.payment_transactions;
create policy "Members view own payment history"
on public.payment_transactions for select
to authenticated
using (user_id = (select auth.uid()) or (select public.is_afrolove_admin()));

drop policy if exists "Members view own usage" on public.member_usage_daily;
create policy "Members view own usage"
on public.member_usage_daily for select
to authenticated
using (user_id = (select auth.uid()) or (select public.is_afrolove_admin()));

drop policy if exists "Members view own boosts" on public.profile_boosts;
create policy "Members view own boosts"
on public.profile_boosts for select
to authenticated
using (user_id = (select auth.uid()) or (select public.is_afrolove_admin()));

grant select, update on public.membership_plans to authenticated;
grant select on public.member_subscriptions to authenticated;
grant select on public.payment_transactions to authenticated;
grant select on public.member_usage_daily to authenticated;
grant select on public.profile_boosts to authenticated;
grant select, update on public.monetization_settings to authenticated;

insert into public.app_private_settings (key, value)
values ('flutterwave_sync_secret_hash', 'd129a0c80ac1ded61c74ab2dda127710d55cdf97195f520a6adabd6d0c167049')
on conflict (key) do update set value = excluded.value, updated_at = now();

create or replace function public.billing_sync_secret_is_valid(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_private_settings
    where key = 'flutterwave_sync_secret_hash'
      and value = encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex')
  );
$$;

revoke all on function public.billing_sync_secret_is_valid(text) from public;

create or replace function public.current_membership_plan(p_user_id uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select s.plan_slug
    from public.member_subscriptions s
    where s.user_id = p_user_id
      and s.status in ('trialing', 'active')
      and (s.current_period_end is null or s.current_period_end > now())
    order by case s.plan_slug when 'vip' then 3 when 'premium' then 2 else 1 end desc,
             s.updated_at desc
    limit 1
  ), 'free');
$$;

grant execute on function public.current_membership_plan(uuid) to authenticated;

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
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_plan := public.current_membership_plan(v_user_id);

  select * into v_plan_row
  from public.membership_plans
  where slug = v_plan;

  select * into v_subscription
  from public.member_subscriptions
  where user_id = v_user_id
    and status in ('pending', 'trialing', 'active', 'past_due')
  order by updated_at desc
  limit 1;

  select * into v_usage
  from public.member_usage_daily
  where user_id = v_user_id and usage_date = current_date;

  select coalesce(sum(super_likes_count), 0)::integer
  into v_weekly_super_likes
  from public.member_usage_daily
  where user_id = v_user_id
    and usage_date >= current_date - 6;

  select count(*)::integer
  into v_incoming_count
  from public.interactions i
  where i.target_id = v_user_id
    and i.action in ('like', 'super_like')
    and not exists (
      select 1 from public.matches m
      where m.is_active = true
        and least(m.user_low, m.user_high) = least(v_user_id, i.actor_id)
        and greatest(m.user_low, m.user_high) = greatest(v_user_id, i.actor_id)
    );

  return jsonb_build_object(
    'plan', v_plan,
    'planName', coalesce(v_plan_row.name, 'Free'),
    'status', coalesce(v_subscription.status, 'active'),
    'currency', coalesce(v_plan_row.currency, 'NGN'),
    'monthlyPriceMinor', coalesce(v_plan_row.monthly_price_minor, 0),
    'currentPeriodEnd', v_subscription.current_period_end,
    'cancelAtPeriodEnd', coalesce(v_subscription.cancel_at_period_end, false),
    'isTest', coalesce(v_subscription.is_test, true),
    'features', coalesce(v_plan_row.features, '{}'::jsonb),
    'usage', jsonb_build_object(
      'likesToday', coalesce(v_usage.likes_count, 0),
      'superLikesThisWeek', v_weekly_super_likes,
      'rewindsToday', coalesce(v_usage.rewinds_count, 0),
      'boostsThisMonth', coalesce(v_usage.boosts_count, 0)
    ),
    'incomingLikeCount', v_incoming_count
  );
end;
$$;

grant execute on function public.get_membership_snapshot() to authenticated;

create or replace function public.get_checkout_configuration(p_plan_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_settings public.monetization_settings%rowtype;
  v_amount integer;
  v_plan_id text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_plan_slug not in ('premium', 'vip') then raise exception 'Invalid membership plan'; end if;

  select * into v_settings from public.monetization_settings where singleton = true;
  v_amount := case when p_plan_slug = 'premium' then v_settings.premium_price_minor else v_settings.vip_price_minor end;
  v_plan_id := case when p_plan_slug = 'premium' then v_settings.premium_payment_plan_id else v_settings.vip_payment_plan_id end;

  return jsonb_build_object(
    'plan', p_plan_slug,
    'amountMinor', v_amount,
    'currency', v_settings.currency,
    'providerPlanId', v_plan_id,
    'testMode', v_settings.flutterwave_test_mode,
    'checkoutEnabled', v_settings.checkout_enabled,
    'subaccounts', case
      when nullif(v_settings.owner_subaccount_id, '') is not null
       and nullif(v_settings.partner_subaccount_id, '') is not null
      then jsonb_build_array(
        jsonb_build_object('id', v_settings.owner_subaccount_id, 'transaction_split_ratio', v_settings.owner_split_ratio),
        jsonb_build_object('id', v_settings.partner_subaccount_id, 'transaction_split_ratio', v_settings.partner_split_ratio)
      )
      else '[]'::jsonb
    end
  );
end;
$$;

grant execute on function public.get_checkout_configuration(text) to authenticated;

create or replace function public.create_payment_transaction(
  p_plan_slug text,
  p_tx_ref text,
  p_amount_minor integer,
  p_currency text,
  p_split_snapshot jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
  v_config jsonb;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_plan_slug not in ('premium', 'vip') then raise exception 'Invalid membership plan'; end if;
  v_config := public.get_checkout_configuration(p_plan_slug);
  if p_amount_minor <> (v_config ->> 'amountMinor')::integer
     or upper(p_currency) <> upper(v_config ->> 'currency') then
    raise exception 'Payment amount does not match current pricing';
  end if;

  insert into public.payment_transactions (
    user_id, tx_ref, plan_slug, amount_minor, currency, split_snapshot
  ) values (
    v_user_id, p_tx_ref, p_plan_slug, p_amount_minor, upper(p_currency), coalesce(p_split_snapshot, '{}'::jsonb)
  ) returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_payment_transaction(text, text, integer, text, jsonb) to authenticated;

create or replace function public.set_payment_checkout_link(
  p_tx_ref text,
  p_checkout_link text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.payment_transactions
  set checkout_link = left(p_checkout_link, 2000), updated_at = now()
  where tx_ref = p_tx_ref and user_id = auth.uid();
end;
$$;

grant execute on function public.set_payment_checkout_link(text, text) to authenticated;

create or replace function public.confirm_flutterwave_payment(
  p_tx_ref text,
  p_provider_transaction_id text,
  p_amount_minor integer,
  p_currency text,
  p_provider_subscription_id text,
  p_provider_plan_id text,
  p_payload jsonb,
  p_sync_secret text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transaction public.payment_transactions%rowtype;
  v_subscription_id uuid;
begin
  if not public.billing_sync_secret_is_valid(p_sync_secret) then
    raise exception 'Invalid billing credentials';
  end if;

  select * into v_transaction
  from public.payment_transactions
  where tx_ref = p_tx_ref
  for update;

  if v_transaction.id is null then raise exception 'Payment reference not found'; end if;
  if v_transaction.amount_minor <> p_amount_minor
     or upper(v_transaction.currency) <> upper(p_currency) then
    raise exception 'Verified payment does not match transaction';
  end if;

  update public.payment_transactions
  set status = 'successful',
      provider_transaction_id = p_provider_transaction_id,
      provider_payload = coalesce(p_payload, '{}'::jsonb),
      paid_at = coalesce(paid_at, now()),
      updated_at = now()
  where id = v_transaction.id;

  update public.member_subscriptions
  set status = 'expired', updated_at = now()
  where user_id = v_transaction.user_id
    and status in ('pending', 'trialing', 'active', 'past_due');

  insert into public.member_subscriptions (
    user_id, plan_slug, status, provider, provider_subscription_id,
    provider_plan_id, customer_email, current_period_start, current_period_end,
    cancel_at_period_end, is_test, metadata
  )
  select
    v_transaction.user_id,
    v_transaction.plan_slug,
    'active',
    'flutterwave',
    nullif(p_provider_subscription_id, ''),
    nullif(p_provider_plan_id, ''),
    profiles.email,
    now(),
    now() + interval '1 month',
    false,
    true,
    jsonb_build_object('transactionId', p_provider_transaction_id, 'txRef', p_tx_ref)
  from public.profiles
  where profiles.id = v_transaction.user_id
  returning id into v_subscription_id;

  update public.payment_transactions
  set subscription_id = v_subscription_id
  where id = v_transaction.id;

  return v_transaction.plan_slug;
end;
$$;

revoke all on function public.confirm_flutterwave_payment(text, text, integer, text, text, text, jsonb, text) from public;
grant execute on function public.confirm_flutterwave_payment(text, text, integer, text, text, text, jsonb, text) to anon, authenticated;

create or replace function public.admin_grant_test_membership(
  p_user_id uuid,
  p_plan_slug text,
  p_days integer default 30
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_afrolove_admin(auth.uid()) then raise exception 'Admin access required'; end if;
  if p_plan_slug not in ('free', 'premium', 'vip') then raise exception 'Invalid plan'; end if;
  if p_days < 1 or p_days > 365 then raise exception 'Invalid membership duration'; end if;

  update public.member_subscriptions
  set status = 'expired', updated_at = now()
  where user_id = p_user_id and status in ('pending', 'trialing', 'active', 'past_due');

  if p_plan_slug = 'free' then return null; end if;

  insert into public.member_subscriptions (
    user_id, plan_slug, status, provider, current_period_start,
    current_period_end, is_test, metadata
  ) values (
    p_user_id, p_plan_slug, 'active', 'admin_test', now(),
    now() + make_interval(days => p_days), true,
    jsonb_build_object('grantedBy', auth.uid(), 'days', p_days)
  ) returning id into v_id;

  insert into public.admin_audit_logs (admin_id, action, target_user_id, metadata)
  values (auth.uid(), 'membership_test_granted', p_user_id,
    jsonb_build_object('plan', p_plan_slug, 'days', p_days));

  return v_id;
end;
$$;

grant execute on function public.admin_grant_test_membership(uuid, text, integer) to authenticated;

create or replace function public.cancel_membership_at_period_end()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.member_subscriptions
  set cancel_at_period_end = true, updated_at = now()
  where user_id = auth.uid() and status in ('trialing', 'active', 'past_due');
end;
$$;

grant execute on function public.cancel_membership_at_period_end() to authenticated;

create or replace function public.activate_vip_boost()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan text;
  v_monthly_count integer;
  v_end timestamptz;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  v_plan := public.current_membership_plan(v_user_id);
  if v_plan <> 'vip' then raise exception 'VIP membership required'; end if;

  select count(*)::integer into v_monthly_count
  from public.profile_boosts
  where user_id = v_user_id
    and created_at >= date_trunc('month', now());

  if v_monthly_count >= 1 then raise exception 'Your monthly VIP boost has already been used'; end if;
  v_end := now() + interval '30 minutes';

  insert into public.profile_boosts (user_id, starts_at, ends_at, source)
  values (v_user_id, now(), v_end, 'vip_monthly');

  insert into public.member_usage_daily (user_id, usage_date, boosts_count)
  values (v_user_id, current_date, 1)
  on conflict (user_id, usage_date)
  do update set boosts_count = public.member_usage_daily.boosts_count + 1, updated_at = now();

  return v_end;
end;
$$;

grant execute on function public.activate_vip_boost() to authenticated;

-- Enforce membership limits inside the SECURITY DEFINER dating RPC.
create or replace function public.record_interaction(
  p_target_id uuid,
  p_action text
)
returns table(match_id uuid, matched boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_low uuid;
  v_high uuid;
  v_match_id uuid;
  v_plan text;
  v_existing_action text;
  v_likes_today integer := 0;
  v_super_likes_week integer := 0;
  v_free_limit integer := 10;
begin
  if v_actor_id is null then raise exception 'Authentication required'; end if;
  if public.is_afrolove_admin(v_actor_id) then raise exception 'Staff accounts cannot use dating interactions'; end if;
  if p_target_id is null or p_target_id = v_actor_id then raise exception 'Invalid target profile'; end if;
  if public.is_afrolove_admin(p_target_id) then raise exception 'Profile is unavailable'; end if;
  if p_action not in ('like', 'pass', 'super_like') then raise exception 'Invalid interaction action'; end if;

  if not exists (
    select 1 from public.profiles
    where id = p_target_id and onboarding_completed = true
      and profile_visibility = 'visible'
      and account_status in ('active', 'warned', 'restricted')
  ) then raise exception 'Profile is unavailable'; end if;

  if public.are_members_blocked(v_actor_id, p_target_id) then raise exception 'Profile is unavailable'; end if;

  v_plan := public.current_membership_plan(v_actor_id);
  select action into v_existing_action from public.interactions
  where actor_id = v_actor_id and target_id = p_target_id;

  if p_action = 'like' and coalesce(v_existing_action, '') <> 'like' then
    if v_plan = 'free' then
      select free_daily_like_limit into v_free_limit
      from public.monetization_settings where singleton = true;
      select coalesce(likes_count, 0) into v_likes_today
      from public.member_usage_daily
      where user_id = v_actor_id and usage_date = current_date;
      if v_likes_today >= v_free_limit then
        raise exception 'Daily like limit reached. Upgrade to Premium for unlimited likes.';
      end if;
    end if;

    insert into public.member_usage_daily (user_id, usage_date, likes_count)
    values (v_actor_id, current_date, 1)
    on conflict (user_id, usage_date)
    do update set likes_count = public.member_usage_daily.likes_count + 1, updated_at = now();
  end if;

  if p_action = 'super_like' and coalesce(v_existing_action, '') <> 'super_like' then
    if v_plan = 'free' then raise exception 'Super Likes require Premium or VIP.'; end if;
    select coalesce(sum(super_likes_count), 0)::integer into v_super_likes_week
    from public.member_usage_daily
    where user_id = v_actor_id and usage_date >= current_date - 6;
    if (v_plan = 'premium' and v_super_likes_week >= 5)
       or (v_plan = 'vip' and v_super_likes_week >= 10) then
      raise exception 'Weekly Super Like allowance reached.';
    end if;

    insert into public.member_usage_daily (user_id, usage_date, super_likes_count)
    values (v_actor_id, current_date, 1)
    on conflict (user_id, usage_date)
    do update set super_likes_count = public.member_usage_daily.super_likes_count + 1, updated_at = now();
  end if;

  insert into public.interactions (actor_id, target_id, action)
  values (v_actor_id, p_target_id, p_action)
  on conflict (actor_id, target_id)
  do update set action = excluded.action, updated_at = now();

  if p_action in ('like', 'super_like') and exists (
    select 1 from public.interactions
    where actor_id = p_target_id and target_id = v_actor_id
      and action in ('like', 'super_like')
  ) then
    v_low := least(v_actor_id, p_target_id);
    v_high := greatest(v_actor_id, p_target_id);
    insert into public.matches (user_low, user_high, is_active, last_message_at)
    values (v_low, v_high, true, now())
    on conflict (user_low, user_high)
    do update set is_active = true, updated_at = now(), last_message_at = now()
    returning id into v_match_id;
    return query select v_match_id, true;
    return;
  end if;

  return query select null::uuid, false;
end;
$$;

grant execute on function public.record_interaction(uuid, text) to authenticated;

create or replace function public.undo_interaction(p_target_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_low uuid;
  v_high uuid;
  v_plan text;
begin
  if v_actor_id is null then raise exception 'Authentication required'; end if;
  v_plan := public.current_membership_plan(v_actor_id);
  if v_plan = 'free' then raise exception 'Rewind requires Premium or VIP.'; end if;

  delete from public.interactions where actor_id = v_actor_id and target_id = p_target_id;
  v_low := least(v_actor_id, p_target_id);
  v_high := greatest(v_actor_id, p_target_id);
  delete from public.matches where user_low = v_low and user_high = v_high;

  insert into public.member_usage_daily (user_id, usage_date, rewinds_count)
  values (v_actor_id, current_date, 1)
  on conflict (user_id, usage_date)
  do update set rewinds_count = public.member_usage_daily.rewinds_count + 1, updated_at = now();
end;
$$;

grant execute on function public.undo_interaction(uuid) to authenticated;
