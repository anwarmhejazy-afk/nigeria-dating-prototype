-- AfroLove Paystack Test integration.
-- Confirms a Paystack transaction atomically and grants one membership period.

create or replace function public.confirm_paystack_payment(
  p_tx_ref text,
  p_provider_transaction_id text,
  p_amount_minor integer,
  p_currency text,
  p_payload jsonb,
  p_is_test boolean,
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

  if v_transaction.id is null then
    raise exception 'Payment reference not found';
  end if;

  if v_transaction.amount_minor <> p_amount_minor
     or upper(v_transaction.currency) <> upper(p_currency) then
    raise exception 'Verified payment does not match transaction';
  end if;

  if v_transaction.status = 'successful'
     and v_transaction.subscription_id is not null then
    return v_transaction.plan_slug;
  end if;

  update public.payment_transactions
  set status = 'successful',
      provider_transaction_id = nullif(p_provider_transaction_id, ''),
      provider_payload = coalesce(p_payload, '{}'::jsonb),
      paid_at = coalesce(paid_at, now()),
      updated_at = now()
  where id = v_transaction.id;

  update public.member_subscriptions
  set status = 'expired', updated_at = now()
  where user_id = v_transaction.user_id
    and status in ('pending', 'trialing', 'active', 'past_due');

  insert into public.member_subscriptions (
    user_id,
    plan_slug,
    status,
    provider,
    provider_subscription_id,
    provider_plan_id,
    customer_email,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    is_test,
    metadata
  )
  select
    v_transaction.user_id,
    v_transaction.plan_slug,
    'active',
    'paystack',
    null,
    null,
    profiles.email,
    now(),
    now() + interval '1 month',
    false,
    coalesce(p_is_test, true),
    jsonb_build_object(
      'provider', 'paystack',
      'transactionId', p_provider_transaction_id,
      'reference', p_tx_ref
    )
  from public.profiles
  where profiles.id = v_transaction.user_id
  returning id into v_subscription_id;

  update public.payment_transactions
  set subscription_id = v_subscription_id
  where id = v_transaction.id;

  return v_transaction.plan_slug;
end;
$$;

revoke all on function public.confirm_paystack_payment(
  text,
  text,
  integer,
  text,
  jsonb,
  boolean,
  text
) from public;

grant execute on function public.confirm_paystack_payment(
  text,
  text,
  integer,
  text,
  jsonb,
  boolean,
  text
) to anon, authenticated;
