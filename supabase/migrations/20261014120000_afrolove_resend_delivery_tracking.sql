begin;

alter table public.profile_reminder_attempts
  add column if not exists provider_message_id text,
  add column if not exists delivery_status text not null default 'submitted',
  add column if not exists sent_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists opened_at timestamptz,
  add column if not exists clicked_at timestamptz,
  add column if not exists delayed_at timestamptz,
  add column if not exists bounced_at timestamptz,
  add column if not exists complained_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists last_delivery_event_at timestamptz,
  add column if not exists last_delivery_error text;

create unique index if not exists profile_reminder_attempts_provider_message_id_idx
  on public.profile_reminder_attempts(provider_message_id)
  where provider_message_id is not null;

commit;
