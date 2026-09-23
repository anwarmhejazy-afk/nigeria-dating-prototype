-- AfroLove payment cleanup: PayPal is the only active payment provider.
-- This migration removes obsolete provider-specific database functions/settings
-- while preserving generic membership, subscription and transaction history.

drop function if exists public.confirm_paystack_payment(text, text, integer, text, jsonb, boolean, text);
drop function if exists public.confirm_paystack_payment(text, text, integer, text, text, text, jsonb, text);
drop function if exists public.confirm_flutterwave_payment(text, text, integer, text, text, text, jsonb, text);
drop function if exists public.get_checkout_configuration(text);
drop function if exists public.create_payment_transaction(text, text, integer, text, jsonb);
drop function if exists public.set_payment_checkout_link(text, text);

alter table if exists public.monetization_settings
  drop column if exists flutterwave_test_mode,
  drop column if exists checkout_enabled,
  drop column if exists premium_payment_plan_id,
  drop column if exists vip_payment_plan_id,
  drop column if exists owner_subaccount_id,
  drop column if exists partner_subaccount_id,
  drop column if exists owner_split_ratio,
  drop column if exists partner_split_ratio;

-- Remove obsolete sync secret if it exists.
delete from public.private_app_settings where key = 'flutterwave_sync_secret_hash';
