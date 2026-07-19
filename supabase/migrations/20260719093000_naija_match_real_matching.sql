create table if not exists public.interactions (
  actor_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  action text not null check (action in ('like', 'pass', 'super_like')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (actor_id, target_id),
  constraint interactions_no_self_action check (actor_id <> target_id)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_low uuid not null references public.profiles(id) on delete cascade,
  user_high uuid not null references public.profiles(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint matches_canonical_pair check (user_low < user_high),
  constraint matches_unique_pair unique (user_low, user_high)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  message_type text not null default 'text' check (message_type in ('text', 'image', 'voice')),
  media_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_no_self_block check (blocker_id <> blocked_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('fake_profile', 'harassment', 'spam', 'inappropriate_content', 'underage', 'other')),
  details text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint reports_no_self_report check (reporter_id <> reported_id)
);

create index if not exists interactions_target_action_idx
on public.interactions (target_id, action, created_at desc);

create index if not exists interactions_actor_created_idx
on public.interactions (actor_id, created_at desc);

create index if not exists matches_user_low_active_idx
on public.matches (user_low, is_active, last_message_at desc);

create index if not exists matches_user_high_active_idx
on public.matches (user_high, is_active, last_message_at desc);

create index if not exists messages_match_created_idx
on public.messages (match_id, created_at);

create index if not exists messages_unread_idx
on public.messages (match_id, sender_id, read_at)
where read_at is null;

create index if not exists blocks_blocked_idx
on public.blocks (blocked_id, blocker_id);

create index if not exists reports_reported_status_idx
on public.reports (reported_id, status, created_at desc);

alter table public.interactions enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

drop policy if exists "Members can view their interactions" on public.interactions;
create policy "Members can view their interactions"
on public.interactions for select
to authenticated
using ((select auth.uid()) = actor_id or (select auth.uid()) = target_id);

drop policy if exists "Members can create their interactions" on public.interactions;
create policy "Members can create their interactions"
on public.interactions for insert
to authenticated
with check ((select auth.uid()) = actor_id);

drop policy if exists "Members can update their interactions" on public.interactions;
create policy "Members can update their interactions"
on public.interactions for update
to authenticated
using ((select auth.uid()) = actor_id)
with check ((select auth.uid()) = actor_id);

drop policy if exists "Members can delete their interactions" on public.interactions;
create policy "Members can delete their interactions"
on public.interactions for delete
to authenticated
using ((select auth.uid()) = actor_id);

drop policy if exists "Match participants can view matches" on public.matches;
create policy "Match participants can view matches"
on public.matches for select
to authenticated
using ((select auth.uid()) in (user_low, user_high));

drop policy if exists "Match participants can view messages" on public.messages;
create policy "Match participants can view messages"
on public.messages for select
to authenticated
using (
  exists (
    select 1
    from public.matches
    where matches.id = messages.match_id
      and matches.is_active = true
      and (select auth.uid()) in (matches.user_low, matches.user_high)
  )
);

drop policy if exists "Match participants can send messages" on public.messages;
create policy "Match participants can send messages"
on public.messages for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.matches
    where matches.id = messages.match_id
      and matches.is_active = true
      and (select auth.uid()) in (matches.user_low, matches.user_high)
  )
);

drop policy if exists "Members can view their blocks" on public.blocks;
create policy "Members can view their blocks"
on public.blocks for select
to authenticated
using ((select auth.uid()) = blocker_id);

drop policy if exists "Members can create their blocks" on public.blocks;
create policy "Members can create their blocks"
on public.blocks for insert
to authenticated
with check ((select auth.uid()) = blocker_id);

drop policy if exists "Members can delete their blocks" on public.blocks;
create policy "Members can delete their blocks"
on public.blocks for delete
to authenticated
using ((select auth.uid()) = blocker_id);

drop policy if exists "Members can create reports" on public.reports;
create policy "Members can create reports"
on public.reports for insert
to authenticated
with check ((select auth.uid()) = reporter_id);

drop policy if exists "Members can view their reports" on public.reports;
create policy "Members can view their reports"
on public.reports for select
to authenticated
using ((select auth.uid()) = reporter_id);

create or replace function public.are_members_blocked(p_first uuid, p_second uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.blocks
    where (blocker_id = p_first and blocked_id = p_second)
       or (blocker_id = p_second and blocked_id = p_first)
  );
$$;

revoke all on function public.are_members_blocked(uuid, uuid) from public;
grant execute on function public.are_members_blocked(uuid, uuid) to authenticated;

create or replace function public.are_members_matched(p_first uuid, p_second uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.matches
    where user_low = least(p_first, p_second)
      and user_high = greatest(p_first, p_second)
      and is_active = true
  );
$$;

revoke all on function public.are_members_matched(uuid, uuid) from public;
grant execute on function public.are_members_matched(uuid, uuid) to authenticated;

drop policy if exists "Authenticated members can view profiles" on public.profiles;
drop policy if exists "Members can view discoverable profiles" on public.profiles;
create policy "Members can view discoverable profiles"
on public.profiles for select
to authenticated
using (
  id = (select auth.uid())
  or public.are_members_matched((select auth.uid()), id)
  or (
    onboarding_completed = true
    and profile_visibility = 'visible'
    and not public.are_members_blocked((select auth.uid()), id)
  )
);

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
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  if p_target_id is null or p_target_id = v_actor_id then
    raise exception 'Invalid target profile';
  end if;

  if p_action not in ('like', 'pass', 'super_like') then
    raise exception 'Invalid interaction action';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_target_id
      and onboarding_completed = true
      and profile_visibility = 'visible'
  ) then
    raise exception 'Profile is unavailable';
  end if;

  if public.are_members_blocked(v_actor_id, p_target_id) then
    raise exception 'Profile is unavailable';
  end if;

  insert into public.interactions (actor_id, target_id, action)
  values (v_actor_id, p_target_id, p_action)
  on conflict (actor_id, target_id)
  do update set
    action = excluded.action,
    updated_at = now();

  if p_action in ('like', 'super_like') and exists (
    select 1
    from public.interactions
    where actor_id = p_target_id
      and target_id = v_actor_id
      and action in ('like', 'super_like')
  ) then
    v_low := least(v_actor_id, p_target_id);
    v_high := greatest(v_actor_id, p_target_id);

    insert into public.matches (user_low, user_high, is_active, last_message_at)
    values (v_low, v_high, true, now())
    on conflict (user_low, user_high)
    do update set
      is_active = true,
      updated_at = now(),
      last_message_at = now()
    returning id into v_match_id;

    return query select v_match_id, true;
    return;
  end if;

  return query select null::uuid, false;
end;
$$;

revoke all on function public.record_interaction(uuid, text) from public;
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
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  delete from public.interactions
  where actor_id = v_actor_id
    and target_id = p_target_id;

  v_low := least(v_actor_id, p_target_id);
  v_high := greatest(v_actor_id, p_target_id);

  delete from public.matches
  where user_low = v_low
    and user_high = v_high;
end;
$$;

revoke all on function public.undo_interaction(uuid) from public;
grant execute on function public.undo_interaction(uuid) to authenticated;

create or replace function public.mark_match_read(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.matches
    where id = p_match_id
      and is_active = true
      and v_user_id in (user_low, user_high)
  ) then
    raise exception 'Match not found';
  end if;

  update public.messages
  set read_at = now()
  where match_id = p_match_id
    and sender_id <> v_user_id
    and read_at is null;
end;
$$;

revoke all on function public.mark_match_read(uuid) from public;
grant execute on function public.mark_match_read(uuid) to authenticated;

create or replace function public.unmatch_member(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_other_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select case when user_low = v_user_id then user_high else user_low end
  into v_other_id
  from public.matches
  where id = p_match_id
    and v_user_id in (user_low, user_high);

  if v_other_id is null then
    raise exception 'Match not found';
  end if;

  delete from public.matches where id = p_match_id;

  update public.interactions
  set action = 'pass', updated_at = now()
  where actor_id = v_user_id
    and target_id = v_other_id;
end;
$$;

revoke all on function public.unmatch_member(uuid) from public;
grant execute on function public.unmatch_member(uuid) to authenticated;

create or replace function public.block_member(p_blocked_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_low uuid;
  v_high uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_blocked_id is null or p_blocked_id = v_user_id then
    raise exception 'Invalid member';
  end if;

  insert into public.blocks (blocker_id, blocked_id)
  values (v_user_id, p_blocked_id)
  on conflict do nothing;

  delete from public.interactions
  where (actor_id = v_user_id and target_id = p_blocked_id)
     or (actor_id = p_blocked_id and target_id = v_user_id);

  v_low := least(v_user_id, p_blocked_id);
  v_high := greatest(v_user_id, p_blocked_id);

  delete from public.matches
  where user_low = v_low
    and user_high = v_high;
end;
$$;

revoke all on function public.block_member(uuid) from public;
grant execute on function public.block_member(uuid) to authenticated;

create or replace function public.update_match_after_message()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.matches
  set last_message_at = new.created_at,
      updated_at = now()
  where id = new.match_id;
  return new;
end;
$$;

drop trigger if exists messages_update_match_activity on public.messages;
create trigger messages_update_match_activity
after insert on public.messages
for each row execute procedure public.update_match_after_message();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
