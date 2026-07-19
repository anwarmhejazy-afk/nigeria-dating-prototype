-- AfroLove Phase 5: selective conversation reporting, admin moderation,
-- verification requests, account controls, and immutable safety audit history.

alter table public.profiles
  add column if not exists account_status text not null default 'active',
  add column if not exists moderation_note text,
  add column if not exists messaging_restricted_until timestamptz,
  add column if not exists suspended_until timestamptz,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references public.profiles(id) on delete set null;

alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status in ('active', 'warned', 'restricted', 'suspended', 'banned'));

create index if not exists profiles_account_status_idx
on public.profiles (account_status, created_at desc);

create table if not exists public.admin_members (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'safety_admin'
    check (role in ('super_admin', 'safety_admin', 'verification_admin', 'analyst')),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_members enable row level security;

create or replace function public.is_afrolove_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_members
    where user_id = p_user_id
      and is_active = true
  );
$$;

revoke all on function public.is_afrolove_admin(uuid) from public;
grant execute on function public.is_afrolove_admin(uuid) to authenticated;

drop policy if exists "Admins can view admin membership" on public.admin_members;
create policy "Admins can view admin membership"
on public.admin_members for select
to authenticated
using ((select public.is_afrolove_admin()));

alter table public.reports
  add column if not exists match_id uuid references public.matches(id) on delete set null,
  add column if not exists evidence_scope text not null default 'profile',
  add column if not exists priority text not null default 'normal',
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null,
  add column if not exists resolution text,
  add column if not exists admin_action text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reporter_blocked boolean not null default false,
  add column if not exists reporter_unmatched boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

alter table public.reports drop constraint if exists reports_category_check;
alter table public.reports
  add constraint reports_category_check
  check (category in (
    'harassment',
    'racism_hate_speech',
    'threats',
    'sexual_harassment',
    'scam_fraud',
    'asking_for_money',
    'business_solicitation',
    'spam',
    'fake_profile',
    'illegal_content',
    'inappropriate_content',
    'underage',
    'other'
  ));

alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports
  add constraint reports_status_check
  check (status in ('open', 'reviewing', 'actioned', 'resolved', 'dismissed'));

alter table public.reports drop constraint if exists reports_evidence_scope_check;
alter table public.reports
  add constraint reports_evidence_scope_check
  check (evidence_scope in ('profile', 'selected', 'last_20', 'full_conversation'));

alter table public.reports drop constraint if exists reports_priority_check;
alter table public.reports
  add constraint reports_priority_check
  check (priority in ('normal', 'high', 'urgent'));

create index if not exists reports_status_priority_idx
on public.reports (status, priority, created_at desc);

create index if not exists reports_match_idx
on public.reports (match_id, created_at desc);

create table if not exists public.report_evidence (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  message_id uuid,
  sender_id uuid,
  sender_display_name text not null default 'AfroLove member',
  body text,
  message_type text not null default 'text',
  media_url text,
  message_created_at timestamptz,
  captured_at timestamptz not null default now()
);

create index if not exists report_evidence_report_created_idx
on public.report_evidence (report_id, message_created_at, captured_at);

create table if not exists public.report_case_notes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  admin_id uuid not null references public.profiles(id) on delete restrict,
  note text not null check (char_length(btrim(note)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists report_case_notes_report_idx
on public.report_case_notes (report_id, created_at desc);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  report_id uuid references public.reports(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_idx
on public.admin_audit_logs (created_at desc);

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'reviewing', 'approved', 'rejected', 'cancelled')),
  member_note text,
  admin_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists verification_requests_one_open_idx
on public.verification_requests (user_id)
where status in ('pending', 'reviewing');

alter table public.report_evidence enable row level security;
alter table public.report_case_notes enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.verification_requests enable row level security;

drop policy if exists "Members can create reports" on public.reports;
drop policy if exists "Members can view their reports" on public.reports;
drop policy if exists "Members and admins can view reports" on public.reports;
create policy "Members and admins can view reports"
on public.reports for select
to authenticated
using (
  (select auth.uid()) = reporter_id
  or (select public.is_afrolove_admin())
);

drop policy if exists "Admins can update reports" on public.reports;
create policy "Admins can update reports"
on public.reports for update
to authenticated
using ((select public.is_afrolove_admin()))
with check ((select public.is_afrolove_admin()));

drop policy if exists "Admins can view report evidence" on public.report_evidence;
create policy "Admins can view report evidence"
on public.report_evidence for select
to authenticated
using ((select public.is_afrolove_admin()));

drop policy if exists "Admins can view case notes" on public.report_case_notes;
create policy "Admins can view case notes"
on public.report_case_notes for select
to authenticated
using ((select public.is_afrolove_admin()));

drop policy if exists "Admins can create case notes" on public.report_case_notes;
create policy "Admins can create case notes"
on public.report_case_notes for insert
to authenticated
with check (
  (select public.is_afrolove_admin())
  and admin_id = (select auth.uid())
);

drop policy if exists "Admins can view audit logs" on public.admin_audit_logs;
create policy "Admins can view audit logs"
on public.admin_audit_logs for select
to authenticated
using ((select public.is_afrolove_admin()));

drop policy if exists "Members can view their verification requests" on public.verification_requests;
create policy "Members can view their verification requests"
on public.verification_requests for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_afrolove_admin())
);

drop policy if exists "Members can create verification requests" on public.verification_requests;
create policy "Members can create verification requests"
on public.verification_requests for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Admins can update verification requests" on public.verification_requests;
create policy "Admins can update verification requests"
on public.verification_requests for update
to authenticated
using ((select public.is_afrolove_admin()))
with check ((select public.is_afrolove_admin()));

-- Prevent members from changing moderation and verification fields through the REST API.
revoke update on public.profiles from authenticated;
grant update (
  display_name,
  username,
  avatar_url,
  bio,
  date_of_birth,
  gender,
  show_me,
  city,
  state,
  country,
  tribe,
  occupation,
  education,
  religion,
  height_cm,
  languages,
  interests,
  looking_for,
  relationship_goal,
  lifestyle,
  photo_urls,
  profile_completion,
  profile_visibility,
  onboarding_completed,
  is_online,
  last_seen
) on public.profiles to authenticated;

-- Replace profile visibility with moderation-aware discovery rules.
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
    and not public.are_members_blocked((select auth.uid()), id)
  )
);

-- A restricted, suspended, or banned member cannot send new messages.
drop policy if exists "Match participants can send messages" on public.messages;
create policy "Match participants can send messages"
on public.messages for insert
to authenticated
with check (
  sender_id = (select auth.uid())
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

create or replace function public.submit_safety_report(
  p_reported_id uuid,
  p_match_id uuid,
  p_category text,
  p_details text,
  p_evidence_scope text,
  p_selected_message_ids uuid[] default '{}',
  p_block_member boolean default false,
  p_unmatch boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reporter_id uuid := auth.uid();
  v_report_id uuid;
  v_other_id uuid;
  v_priority text := 'normal';
  v_evidence_count integer := 0;
begin
  if v_reporter_id is null then
    raise exception 'Authentication required';
  end if;

  if p_reported_id is null or p_reported_id = v_reporter_id then
    raise exception 'Invalid reported member';
  end if;

  if p_category not in (
    'harassment', 'racism_hate_speech', 'threats', 'sexual_harassment',
    'scam_fraud', 'asking_for_money', 'business_solicitation', 'spam',
    'fake_profile', 'illegal_content', 'inappropriate_content', 'underage', 'other'
  ) then
    raise exception 'Invalid report category';
  end if;

  if p_evidence_scope not in ('profile', 'selected', 'last_20', 'full_conversation') then
    raise exception 'Invalid evidence scope';
  end if;

  if p_category in ('threats', 'illegal_content', 'underage') then
    v_priority := 'urgent';
  elsif p_category in ('racism_hate_speech', 'sexual_harassment', 'scam_fraud', 'asking_for_money') then
    v_priority := 'high';
  end if;

  if p_match_id is not null then
    select case when user_low = v_reporter_id then user_high else user_low end
      into v_other_id
    from public.matches
    where id = p_match_id
      and v_reporter_id in (user_low, user_high);

    if v_other_id is null or v_other_id <> p_reported_id then
      raise exception 'Conversation not found';
    end if;
  elsif p_evidence_scope <> 'profile' then
    raise exception 'Conversation evidence requires a match';
  end if;

  insert into public.reports (
    reporter_id,
    reported_id,
    match_id,
    category,
    details,
    status,
    evidence_scope,
    priority,
    reporter_blocked,
    reporter_unmatched
  )
  values (
    v_reporter_id,
    p_reported_id,
    p_match_id,
    p_category,
    nullif(left(btrim(coalesce(p_details, '')), 2000), ''),
    'open',
    p_evidence_scope,
    v_priority,
    p_block_member,
    p_unmatch or p_block_member
  )
  returning id into v_report_id;

  if p_match_id is not null and p_evidence_scope = 'selected' then
    if coalesce(cardinality(p_selected_message_ids), 0) = 0 then
      raise exception 'Select at least one message';
    end if;

    insert into public.report_evidence (
      report_id, message_id, sender_id, sender_display_name,
      body, message_type, media_url, message_created_at
    )
    select
      v_report_id,
      messages.id,
      messages.sender_id,
      coalesce(nullif(profiles.display_name, ''), 'AfroLove member'),
      messages.body,
      messages.message_type,
      messages.media_url,
      messages.created_at
    from public.messages
    left join public.profiles on profiles.id = messages.sender_id
    where messages.match_id = p_match_id
      and messages.id = any(p_selected_message_ids)
    order by messages.created_at;

  elsif p_match_id is not null and p_evidence_scope = 'last_20' then
    insert into public.report_evidence (
      report_id, message_id, sender_id, sender_display_name,
      body, message_type, media_url, message_created_at
    )
    select
      v_report_id,
      evidence.id,
      evidence.sender_id,
      evidence.sender_display_name,
      evidence.body,
      evidence.message_type,
      evidence.media_url,
      evidence.created_at
    from (
      select
        messages.id,
        messages.sender_id,
        coalesce(nullif(profiles.display_name, ''), 'AfroLove member') as sender_display_name,
        messages.body,
        messages.message_type,
        messages.media_url,
        messages.created_at
      from public.messages
      left join public.profiles on profiles.id = messages.sender_id
      where messages.match_id = p_match_id
      order by messages.created_at desc
      limit 20
    ) as evidence
    order by evidence.created_at;

  elsif p_match_id is not null and p_evidence_scope = 'full_conversation' then
    insert into public.report_evidence (
      report_id, message_id, sender_id, sender_display_name,
      body, message_type, media_url, message_created_at
    )
    select
      v_report_id,
      evidence.id,
      evidence.sender_id,
      evidence.sender_display_name,
      evidence.body,
      evidence.message_type,
      evidence.media_url,
      evidence.created_at
    from (
      select
        messages.id,
        messages.sender_id,
        coalesce(nullif(profiles.display_name, ''), 'AfroLove member') as sender_display_name,
        messages.body,
        messages.message_type,
        messages.media_url,
        messages.created_at
      from public.messages
      left join public.profiles on profiles.id = messages.sender_id
      where messages.match_id = p_match_id
      order by messages.created_at desc
      limit 300
    ) as evidence
    order by evidence.created_at;
  end if;

  select count(*) into v_evidence_count
  from public.report_evidence
  where report_id = v_report_id;

  if p_evidence_scope = 'selected' and v_evidence_count = 0 then
    raise exception 'Selected messages were unavailable';
  end if;

  insert into public.admin_audit_logs (
    admin_id, action, target_user_id, report_id, metadata
  )
  values (
    null,
    'member_report_submitted',
    p_reported_id,
    v_report_id,
    jsonb_build_object(
      'reporter_id', v_reporter_id,
      'category', p_category,
      'evidence_scope', p_evidence_scope,
      'evidence_count', v_evidence_count
    )
  );

  if p_block_member then
    perform public.block_member(p_reported_id);
  elsif p_unmatch and p_match_id is not null then
    perform public.unmatch_member(p_match_id);
  end if;

  return v_report_id;
end;
$$;

revoke all on function public.submit_safety_report(uuid, uuid, text, text, text, uuid[], boolean, boolean) from public;
grant execute on function public.submit_safety_report(uuid, uuid, text, text, text, uuid[], boolean, boolean) to authenticated;

create or replace function public.admin_moderate_member(
  p_member_id uuid,
  p_action text,
  p_note text default null,
  p_duration_hours integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := auth.uid();
  v_until timestamptz;
begin
  if v_admin_id is null or not public.is_afrolove_admin(v_admin_id) then
    raise exception 'Admin access required';
  end if;

  if p_member_id is null or p_member_id = v_admin_id then
    raise exception 'Invalid member';
  end if;

  if p_duration_hours is not null then
    v_until := now() + make_interval(hours => greatest(1, least(p_duration_hours, 8760)));
  end if;

  case p_action
    when 'warn' then
      update public.profiles
      set account_status = 'warned',
          moderation_note = nullif(left(btrim(coalesce(p_note, '')), 2000), '')
      where id = p_member_id;
    when 'restrict_messaging' then
      update public.profiles
      set account_status = 'restricted',
          messaging_restricted_until = coalesce(v_until, now() + interval '72 hours'),
          moderation_note = nullif(left(btrim(coalesce(p_note, '')), 2000), '')
      where id = p_member_id;
    when 'suspend' then
      update public.profiles
      set account_status = 'suspended',
          suspended_until = coalesce(v_until, now() + interval '168 hours'),
          is_online = false,
          moderation_note = nullif(left(btrim(coalesce(p_note, '')), 2000), '')
      where id = p_member_id;
    when 'ban' then
      update public.profiles
      set account_status = 'banned',
          profile_visibility = 'hidden',
          is_online = false,
          suspended_until = null,
          moderation_note = nullif(left(btrim(coalesce(p_note, '')), 2000), '')
      where id = p_member_id;
    when 'restore' then
      update public.profiles
      set account_status = 'active',
          messaging_restricted_until = null,
          suspended_until = null,
          moderation_note = null,
          profile_visibility = 'visible'
      where id = p_member_id;
    when 'verify' then
      update public.profiles
      set is_verified = true,
          verified_at = now(),
          verified_by = v_admin_id
      where id = p_member_id;
    when 'remove_verification' then
      update public.profiles
      set is_verified = false,
          verified_at = null,
          verified_by = null
      where id = p_member_id;
    else
      raise exception 'Invalid moderation action';
  end case;

  if not found then
    raise exception 'Member not found';
  end if;

  insert into public.admin_audit_logs (
    admin_id, action, target_user_id, metadata
  )
  values (
    v_admin_id,
    p_action,
    p_member_id,
    jsonb_build_object(
      'note', nullif(left(btrim(coalesce(p_note, '')), 2000), ''),
      'duration_hours', p_duration_hours
    )
  );
end;
$$;

revoke all on function public.admin_moderate_member(uuid, text, text, integer) from public;
grant execute on function public.admin_moderate_member(uuid, text, text, integer) to authenticated;

create or replace function public.admin_resolve_report(
  p_report_id uuid,
  p_status text,
  p_action text default 'none',
  p_note text default null,
  p_duration_hours integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := auth.uid();
  v_reported_id uuid;
  v_until timestamptz;
begin
  if v_admin_id is null or not public.is_afrolove_admin(v_admin_id) then
    raise exception 'Admin access required';
  end if;

  if p_status not in ('open', 'reviewing', 'actioned', 'resolved', 'dismissed') then
    raise exception 'Invalid report status';
  end if;

  select reported_id into v_reported_id
  from public.reports
  where id = p_report_id;

  if v_reported_id is null then
    raise exception 'Report not found';
  end if;

  if p_duration_hours is not null then
    v_until := now() + make_interval(hours => greatest(1, least(p_duration_hours, 8760)));
  end if;

  case p_action
    when 'none' then null;
    when 'warn' then
      update public.profiles
      set account_status = 'warned',
          moderation_note = nullif(left(btrim(coalesce(p_note, '')), 2000), '')
      where id = v_reported_id;
    when 'restrict_messaging' then
      update public.profiles
      set account_status = 'restricted',
          messaging_restricted_until = coalesce(v_until, now() + interval '72 hours'),
          moderation_note = nullif(left(btrim(coalesce(p_note, '')), 2000), '')
      where id = v_reported_id;
    when 'suspend' then
      update public.profiles
      set account_status = 'suspended',
          suspended_until = coalesce(v_until, now() + interval '168 hours'),
          is_online = false,
          moderation_note = nullif(left(btrim(coalesce(p_note, '')), 2000), '')
      where id = v_reported_id;
    when 'ban' then
      update public.profiles
      set account_status = 'banned',
          profile_visibility = 'hidden',
          is_online = false,
          suspended_until = null,
          moderation_note = nullif(left(btrim(coalesce(p_note, '')), 2000), '')
      where id = v_reported_id;
    when 'restore' then
      update public.profiles
      set account_status = 'active',
          messaging_restricted_until = null,
          suspended_until = null,
          moderation_note = null,
          profile_visibility = 'visible'
      where id = v_reported_id;
    when 'require_verification' then
      insert into public.verification_requests (user_id, status, admin_note)
      values (v_reported_id, 'pending', nullif(left(btrim(coalesce(p_note, '')), 2000), ''))
      on conflict (user_id) where status in ('pending', 'reviewing')
      do update set admin_note = excluded.admin_note, updated_at = now();
    else
      raise exception 'Invalid admin action';
  end case;

  update public.reports
  set status = p_status,
      assigned_to = v_admin_id,
      resolution = nullif(left(btrim(coalesce(p_note, '')), 4000), ''),
      admin_action = p_action,
      reviewed_at = case when p_status in ('actioned', 'resolved', 'dismissed') then now() else reviewed_at end,
      updated_at = now()
  where id = p_report_id;

  if nullif(btrim(coalesce(p_note, '')), '') is not null then
    insert into public.report_case_notes (report_id, admin_id, note)
    values (p_report_id, v_admin_id, left(btrim(p_note), 4000));
  end if;

  insert into public.admin_audit_logs (
    admin_id, action, target_user_id, report_id, metadata
  )
  values (
    v_admin_id,
    'report_' || p_status,
    v_reported_id,
    p_report_id,
    jsonb_build_object(
      'admin_action', p_action,
      'duration_hours', p_duration_hours,
      'note', nullif(left(btrim(coalesce(p_note, '')), 2000), '')
    )
  );
end;
$$;

revoke all on function public.admin_resolve_report(uuid, text, text, text, integer) from public;
grant execute on function public.admin_resolve_report(uuid, text, text, text, integer) to authenticated;

create or replace function public.admin_review_verification(
  p_request_id uuid,
  p_decision text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := auth.uid();
  v_user_id uuid;
begin
  if v_admin_id is null or not public.is_afrolove_admin(v_admin_id) then
    raise exception 'Admin access required';
  end if;

  if p_decision not in ('reviewing', 'approved', 'rejected') then
    raise exception 'Invalid verification decision';
  end if;

  select user_id into v_user_id
  from public.verification_requests
  where id = p_request_id;

  if v_user_id is null then
    raise exception 'Verification request not found';
  end if;

  update public.verification_requests
  set status = p_decision,
      admin_note = nullif(left(btrim(coalesce(p_note, '')), 2000), ''),
      reviewed_by = v_admin_id,
      reviewed_at = case when p_decision in ('approved', 'rejected') then now() else reviewed_at end,
      updated_at = now()
  where id = p_request_id;

  if p_decision = 'approved' then
    update public.profiles
    set is_verified = true,
        verified_at = now(),
        verified_by = v_admin_id
    where id = v_user_id;
  elsif p_decision = 'rejected' then
    update public.profiles
    set is_verified = false,
        verified_at = null,
        verified_by = null
    where id = v_user_id;
  end if;

  insert into public.admin_audit_logs (
    admin_id, action, target_user_id, metadata
  )
  values (
    v_admin_id,
    'verification_' || p_decision,
    v_user_id,
    jsonb_build_object('request_id', p_request_id, 'note', p_note)
  );
end;
$$;

revoke all on function public.admin_review_verification(uuid, text, text) from public;
grant execute on function public.admin_review_verification(uuid, text, text) to authenticated;

create or replace function public.request_profile_verification(p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_request_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if exists (
    select 1 from public.profiles
    where id = v_user_id and is_verified = true
  ) then
    raise exception 'Your profile is already verified';
  end if;

  insert into public.verification_requests (user_id, member_note)
  values (v_user_id, nullif(left(btrim(coalesce(p_note, '')), 1000), ''))
  on conflict (user_id) where status in ('pending', 'reviewing')
  do update set member_note = excluded.member_note, updated_at = now()
  returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.request_profile_verification(text) from public;
grant execute on function public.request_profile_verification(text) to authenticated;

-- Keep moderation table timestamps current.
drop trigger if exists admin_members_set_updated_at on public.admin_members;
create trigger admin_members_set_updated_at
before update on public.admin_members
for each row execute procedure public.set_updated_at();

drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at
before update on public.reports
for each row execute procedure public.set_updated_at();

drop trigger if exists verification_requests_set_updated_at on public.verification_requests;
create trigger verification_requests_set_updated_at
before update on public.verification_requests
for each row execute procedure public.set_updated_at();

-- Moderated members cannot create or change discovery interactions.
drop policy if exists "Members can create their interactions" on public.interactions;
create policy "Members can create their interactions"
on public.interactions for insert
to authenticated
with check (
  (select auth.uid()) = actor_id
  and exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.account_status in ('active', 'warned', 'restricted')
  )
);

drop policy if exists "Members can update their interactions" on public.interactions;
create policy "Members can update their interactions"
on public.interactions for update
to authenticated
using ((select auth.uid()) = actor_id)
with check (
  (select auth.uid()) = actor_id
  and exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.account_status in ('active', 'warned', 'restricted')
  )
);

-- Admin metrics expose counts only, never unrelated private message bodies.
create or replace function public.admin_platform_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := auth.uid();
begin
  if v_admin_id is null or not public.is_afrolove_admin(v_admin_id) then
    raise exception 'Admin access required';
  end if;

  return jsonb_build_object(
    'active_matches', (select count(*) from public.matches where is_active = true),
    'messages', (select count(*) from public.messages)
  );
end;
$$;

revoke all on function public.admin_platform_metrics() from public;
grant execute on function public.admin_platform_metrics() to authenticated;

-- The installer replaces this placeholder with the existing member email
-- selected as AfroLove's first super administrator.
do $bootstrap_admin$
declare
  v_admin_id uuid;
begin
  select id into v_admin_id
  from public.profiles
  where lower(email) = lower('anwarmhejazy@gmail.com')
  limit 1;

  if v_admin_id is null then
    raise exception 'The selected admin email does not belong to an existing AfroLove profile';
  end if;

  insert into public.admin_members (user_id, role, is_active, created_by)
  values (v_admin_id, 'super_admin', true, v_admin_id)
  on conflict (user_id)
  do update set role = 'super_admin', is_active = true, updated_at = now();

  insert into public.admin_audit_logs (admin_id, action, target_user_id, metadata)
  values (v_admin_id, 'initial_super_admin_created', v_admin_id, jsonb_build_object('source', 'phase_5_installer'));
end;
$bootstrap_admin$;
