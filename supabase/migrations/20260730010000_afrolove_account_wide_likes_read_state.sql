begin;

create table if not exists public.member_notification_state (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,
  seen_incoming_like_count integer
    not null
    default 0
    check (seen_incoming_like_count >= 0),
  updated_at timestamptz
    not null
    default timezone('utc', now())
);

alter table public.member_notification_state
  enable row level security;

grant select, insert, update
  on public.member_notification_state
  to authenticated;

drop policy if exists
  "Members can read their notification state"
  on public.member_notification_state;

create policy
  "Members can read their notification state"
  on public.member_notification_state
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists
  "Members can create their notification state"
  on public.member_notification_state;

create policy
  "Members can create their notification state"
  on public.member_notification_state
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists
  "Members can update their notification state"
  on public.member_notification_state;

create policy
  "Members can update their notification state"
  on public.member_notification_state
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;
