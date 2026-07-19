-- AfroLove permanent staff administration.
-- Promotes Anwar and Emanuel to independent Super Admin accounts,
-- hides staff profiles from dating discovery, blocks staff dating actions,
-- and removes temporary admin access from the Chinedu Gmail test account.

do $permanent_admins$
declare
  v_anwar_id uuid;
  v_emanuel_id uuid;
  v_temporary_id uuid;
begin
  select id into v_anwar_id
  from public.profiles
  where lower(email) = lower('anwar_hejazy@hotmail.com')
  limit 1;

  select id into v_emanuel_id
  from public.profiles
  where lower(email) = lower('ungwadaemmanuel19@gmail.com')
  limit 1;

  if v_anwar_id is null then
    raise exception 'The Anwar Hotmail account does not have an AfroLove profile';
  end if;

  if v_emanuel_id is null then
    raise exception 'The Emanuel Gmail account does not have an AfroLove profile';
  end if;

  insert into public.admin_members (user_id, role, is_active, created_by)
  values
    (v_anwar_id, 'super_admin', true, v_anwar_id),
    (v_emanuel_id, 'super_admin', true, v_anwar_id)
  on conflict (user_id)
  do update set
    role = 'super_admin',
    is_active = true,
    updated_at = now();

  -- Staff accounts are administration-only and never appear in dating discovery.
  update public.profiles
  set
    profile_visibility = 'hidden',
    onboarding_completed = false,
    is_online = false,
    last_seen = now()
  where id in (v_anwar_id, v_emanuel_id);

  -- Remove temporary administrator access from the Chinedu test account.
  select id into v_temporary_id
  from public.profiles
  where lower(email) = lower('anwarmhejazy@gmail.com')
  limit 1;

  if v_temporary_id is not null
     and v_temporary_id not in (v_anwar_id, v_emanuel_id) then
    delete from public.admin_members
    where user_id = v_temporary_id;
  end if;

  insert into public.admin_audit_logs (
    admin_id,
    action,
    target_user_id,
    metadata
  )
  values
    (
      v_anwar_id,
      'permanent_super_admin_enabled',
      v_anwar_id,
      jsonb_build_object(
        'email', 'anwar_hejazy@hotmail.com',
        'staff_only', true
      )
    ),
    (
      v_anwar_id,
      'permanent_super_admin_enabled',
      v_emanuel_id,
      jsonb_build_object(
        'email', 'ungwadaemmanuel19@gmail.com',
        'staff_only', true
      )
    );

  if v_temporary_id is not null
     and v_temporary_id not in (v_anwar_id, v_emanuel_id) then
    insert into public.admin_audit_logs (
      admin_id,
      action,
      target_user_id,
      metadata
    )
    values (
      v_anwar_id,
      'temporary_admin_access_removed',
      v_temporary_id,
      jsonb_build_object(
        'email', 'anwarmhejazy@gmail.com',
        'account_retained_as_test_member', true
      )
    );
  end if;
end;
$permanent_admins$;

-- Normal members cannot discover staff profiles.
drop policy if exists "Members can view discoverable profiles" on public.profiles;
create policy "Members can view discoverable profiles"
on public.profiles for select
to authenticated
using (
  (select public.is_afrolove_admin())
  or id = (select auth.uid())
  or public.are_members_matched((select auth.uid()), id)
  or (
    onboarding_completed = true
    and profile_visibility = 'visible'
    and account_status in ('active', 'warned', 'restricted')
    and not public.is_afrolove_admin(id)
    and not public.are_members_blocked((select auth.uid()), id)
  )
);

-- Staff accounts cannot create dating interactions through direct table access.
drop policy if exists "Members can create their interactions" on public.interactions;
create policy "Members can create their interactions"
on public.interactions for insert
to authenticated
with check (
  (select auth.uid()) = actor_id
  and not public.is_afrolove_admin(actor_id)
  and not public.is_afrolove_admin(target_id)
);

drop policy if exists "Members can update their interactions" on public.interactions;
create policy "Members can update their interactions"
on public.interactions for update
to authenticated
using (
  (select auth.uid()) = actor_id
  and not public.is_afrolove_admin(actor_id)
)
with check (
  (select auth.uid()) = actor_id
  and not public.is_afrolove_admin(actor_id)
  and not public.is_afrolove_admin(target_id)
);

-- Staff accounts cannot send dating messages.
drop policy if exists "Match participants can send messages" on public.messages;
create policy "Match participants can send messages"
on public.messages for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and not public.is_afrolove_admin((select auth.uid()))
  and exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.account_status in ('active', 'warned')
      and (
        profiles.messaging_restricted_until is null
        or profiles.messaging_restricted_until <= now()
      )
  )
  and exists (
    select 1
    from public.matches
    where matches.id = messages.match_id
      and matches.is_active = true
      and (select auth.uid()) in (matches.user_low, matches.user_high)
  )
);

-- The RPC also rejects staff accounts, even though it is SECURITY DEFINER.
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

  if public.is_afrolove_admin(v_actor_id) then
    raise exception 'Staff accounts cannot use dating interactions';
  end if;

  if p_target_id is null or p_target_id = v_actor_id then
    raise exception 'Invalid target profile';
  end if;

  if public.is_afrolove_admin(p_target_id) then
    raise exception 'Profile is unavailable';
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
      and account_status in ('active', 'warned', 'restricted')
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
