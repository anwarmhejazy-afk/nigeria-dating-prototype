begin;

-- Preserve historical payment/revenue records when a member profile is deleted.
-- New payments still require a real user_id when they are created by the app,
-- but historical rows may become anonymous after account deletion.

alter table public.payment_transactions
  alter column user_id drop not null;

alter table public.payment_transactions
  drop constraint if exists payment_transactions_user_id_fkey;

alter table public.payment_transactions
  add constraint payment_transactions_user_id_fkey
  foreign key (user_id)
  references public.profiles(id)
  on delete set null;

commit;
