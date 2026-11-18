begin;

-- Keep PayPal subscription records even when the associated AfroLove
-- profile no longer exists.

alter table public.member_subscriptions
  alter column user_id drop not null;

alter table public.member_subscriptions
  drop constraint if exists member_subscriptions_user_id_fkey;

alter table public.member_subscriptions
  add constraint member_subscriptions_user_id_fkey
  foreign key (user_id)
  references public.profiles(id)
  on delete set null;

-- Restore Wassim's existing ACTIVE PayPal Premium subscription
-- as an orphaned subscription. This does NOT contact or modify PayPal.

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
  null,
  'premium',
  'active',
  'paypal',
  'I-AU6A4R8GMB3C',
  'P-7CR67111EE333435DNKQWWFA',
  'wasspay@gmail.com',
  '2026-11-16 05:00:05+00',
  '2026-12-16 10:00:00+00',
  false,
  false,
  jsonb_build_object(
    'payer_name', 'Wassim Abari',
    'payer_email', 'wasspay@gmail.com',
    'orphaned_afrolove_account', true,
    'original_afrolove_user_id',
      '309be219-ca3a-4f77-b44e-00f397280b80'
  )
where not exists (
  select 1
  from public.member_subscriptions
  where provider = 'paypal'
    and provider_subscription_id = 'I-AU6A4R8GMB3C'
);

-- Attach the already-recorded £1.95 historical payment
-- to Wassim's preserved subscription row.

update public.payment_transactions p
set
  subscription_id = s.id,
  provider_payload =
    jsonb_set(
      coalesce(p.provider_payload, '{}'::jsonb),
      '{payer_name}',
      to_jsonb('Wassim Abari'::text),
      true
    ),
  updated_at = now()
from public.member_subscriptions s
where p.provider_transaction_id =
        'paypal:6PS37125WY308160L'
  and s.provider = 'paypal'
  and s.provider_subscription_id =
        'I-AU6A4R8GMB3C';

commit;
