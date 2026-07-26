
begin;

-- =========================================================
-- PHASE 4 DATABASE PREFLIGHT
-- =========================================================

do $phase4_preflight$
declare
  v_missing text := '';
begin
  if to_regclass('public.profiles') is null then
    v_missing := v_missing || E'\n- public.profiles';
  end if;

  if to_regclass('public.interactions') is null then
    v_missing := v_missing || E'\n- public.interactions';
  end if;

  if to_regclass('public.matches') is null then
    v_missing := v_missing || E'\n- public.matches';
  end if;

  if to_regclass('public.messages') is null then
    v_missing := v_missing || E'\n- public.messages';
  end if;

  if to_regclass('public.reports') is null then
    v_missing := v_missing || E'\n- public.reports';
  end if;

  if to_regclass(
    'public.verification_requests'
  ) is null then
    v_missing :=
      v_missing ||
      E'\n- public.verification_requests';
  end if;

  if to_regclass(
    'public.admin_members'
  ) is null then
    v_missing :=
      v_missing ||
      E'\n- public.admin_members';
  end if;

  if to_regclass(
    'public.admin_audit_logs'
  ) is null then
    v_missing :=
      v_missing ||
      E'\n- public.admin_audit_logs';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'interactions'
      and column_name = 'actor_id'
  ) then
    v_missing :=
      v_missing ||
      E'\n- public.interactions.actor_id';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'messages'
      and column_name = 'sender_id'
  ) then
    v_missing :=
      v_missing ||
      E'\n- public.messages.sender_id';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reports'
      and column_name = 'category'
  ) then
    v_missing :=
      v_missing ||
      E'\n- public.reports.category';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name =
        'age_verification_status'
  ) then
    v_missing :=
      v_missing ||
      E'\n- profiles.age_verification_status';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name =
        'photo_verification_status'
  ) then
    v_missing :=
      v_missing ||
      E'\n- profiles.photo_verification_status';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name =
        'id_verification_status'
  ) then
    v_missing :=
      v_missing ||
      E'\n- profiles.id_verification_status';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name =
        'verification_restricted'
  ) then
    v_missing :=
      v_missing ||
      E'\n- profiles.verification_restricted';
  end if;

  if to_regprocedure(
    'public.is_afrolove_admin(uuid)'
  ) is null then
    v_missing :=
      v_missing ||
      E'\n- is_afrolove_admin(uuid)';
  end if;

  if to_regprocedure(
    'public.admin_review_layered_verification(uuid,text,text)'
  ) is null then
    v_missing :=
      v_missing ||
      E'\n- admin_review_layered_verification(uuid,text,text)';
  end if;

  if v_missing <> '' then
    raise exception
      'AfroLove Phase 4 preflight failed. Missing:%',
      v_missing;
  end if;
end;
$phase4_preflight$;

-- AfroLove layered verification production enforcement.
--
-- This migration is intentionally stored in supabase/pending during testing.
-- The approved production deployment will move it into migrations and apply
-- it only after the verification pages are deployed.

create or replace function
public.verification_access_allowed(
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_user_id
      and onboarding_completed = true
      and age_verification_status =
        'confirmed'
      and photo_verification_status =
        'approved'
      and id_verification_status in (
        'not_required',
        'approved'
      )
      and verification_restricted = false
      and account_status in (
        'active',
        'warned',
        'restricted'
      )
  );
$$;

revoke all on function
  public.verification_access_allowed(uuid)
from public;

grant execute on function
  public.verification_access_allowed(uuid)
to authenticated;


create or replace function
public.enforce_layered_verification_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_approved boolean;
begin
  select exists (
    select 1
    from public.admin_members
    where user_id = new.id
      and is_active = true
  )
  into v_is_admin;

  if new.date_of_birth is not null
    and new.date_of_birth >
      (
        current_date -
        interval '18 years'
      )::date then

    new.age_verification_status :=
      'blocked';

    new.photo_verification_status :=
      'rejected';

    new.id_verification_status :=
      'rejected';

    new.verification_restricted :=
      true;

    new.verification_restriction_reason :=
      'AfroLove is available only to adults aged 18 or older';

    new.account_status := 'banned';
    new.profile_visibility := 'hidden';
    new.is_online := false;
    new.is_verified := false;
    new.verified_at := null;
    new.verified_by := null;

    return new;
  end if;

  if v_is_admin then
    new.profile_visibility := 'hidden';
    new.is_online := false;
    return new;
  end if;

  if new.onboarding_completed = true then
    v_approved :=
      new.age_verification_status =
        'confirmed'
      and new.photo_verification_status =
        'approved'
      and new.id_verification_status in (
        'not_required',
        'approved'
      )
      and new.account_status in (
        'active',
        'warned',
        'restricted'
      );

    if v_approved then
      new.verification_restricted :=
        false;

      new.verification_restriction_reason :=
        null;

      new.is_verified := true;

      if new.account_status in (
        'active',
        'warned',
        'restricted'
      ) then
        new.profile_visibility :=
          'visible';
      end if;
    else
      new.verification_restricted :=
        true;

      new.is_verified := false;
      new.verified_at := null;
      new.verified_by := null;
      new.profile_visibility := 'hidden';

      new.verification_restriction_reason :=
        case
          when new.date_of_birth is null
            then
              'Date of birth confirmation required'

          when new.age_verification_status =
            'review_required'
            then
              'Age verification required'

          when new.age_verification_status <>
            'confirmed'
            then
              'Age verification required'

          when new.photo_verification_status =
            'reviewing'
            then
              'Photo verification is under review'

          when new.photo_verification_status =
            'rejected'
            then
              'Photo verification was not accepted'

          when new.photo_verification_status <>
            'approved'
            then
              'Photo verification required'

          when new.id_verification_status =
            'required'
            then
              'Government ID verification required'

          when new.id_verification_status in (
            'pending',
            'reviewing'
          )
            then
              'Identity verification is under review'

          when new.id_verification_status =
            'rejected'
            then
              'Identity verification was not accepted'

          else
            'Verification required'
        end;
    end if;
  end if;

  if new.account_status in (
    'suspended',
    'banned'
  ) then
    new.profile_visibility := 'hidden';
    new.is_online := false;
  end if;

  return new;
end;
$$;

drop trigger if exists
  profiles_enforce_layered_verification
on public.profiles;

create trigger
  profiles_enforce_layered_verification
before insert or update of
  onboarding_completed,
  date_of_birth,
  age_verification_status,
  photo_verification_status,
  id_verification_status,
  verification_restricted,
  is_verified,
  account_status
on public.profiles
for each row
execute procedure
  public.enforce_layered_verification_state();


-- Preserve access for existing verified adult members.
update public.profiles
set
  age_verification_status =
    'confirmed',
  photo_verification_status =
    'approved',
  id_verification_status =
    case
      when id_verification_status =
        'approved'
        then 'approved'
      else 'not_required'
    end,
  age_verified_at =
    coalesce(age_verified_at, now()),
  photo_verified_at =
    coalesce(photo_verified_at, now()),
  verification_restricted =
    false,
  verification_restriction_reason =
    null
where is_verified = true
  and date_of_birth is not null
  and date_of_birth <=
    (
      current_date -
      interval '18 years'
    )::date;


-- Restrict every completed profile that has not passed verification.
update public.profiles
set
  verification_restricted = true
where onboarding_completed = true
  and not (
    age_verification_status =
      'confirmed'
    and photo_verification_status =
      'approved'
    and id_verification_status in (
      'not_required',
      'approved'
    )
  );


create or replace function
public.require_verification_for_interaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.verification_access_allowed(
    new.actor_id
  ) then
    raise exception
      'Complete age and photo verification before using Discovery'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists
  interactions_require_verification
on public.interactions;

create trigger
  interactions_require_verification
before insert or update
on public.interactions
for each row
execute procedure
  public.require_verification_for_interaction();


create or replace function
public.require_verification_for_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.verification_access_allowed(
    new.sender_id
  ) then
    raise exception
      'Complete age and photo verification before sending messages'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists
  messages_require_verification
on public.messages;

create trigger
  messages_require_verification
before insert
on public.messages
for each row
execute procedure
  public.require_verification_for_message();


create or replace function
public.restrict_reported_underage_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_category text;
  v_reported_text text;
  v_reported_id uuid;
begin
  v_category :=
    to_jsonb(new) ->> 'category';

  if v_category <> 'underage' then
    return new;
  end if;

  v_reported_text :=
    coalesce(
      to_jsonb(new) ->> 'reported_id',
      to_jsonb(new) ->> 'reported_user_id',
      to_jsonb(new) ->> 'target_user_id'
    );

  if v_reported_text is null then
    return new;
  end if;

  begin
    v_reported_id :=
      v_reported_text::uuid;
  exception
    when others then
      return new;
  end;

  update public.profiles
  set
    age_verification_status =
      'review_required',
    id_verification_status =
      'required',
    verification_restricted =
      true,
    verification_restriction_reason =
      'Age verification required after an underage safety report',
    profile_visibility =
      'hidden',
    is_online =
      false,
    is_verified =
      false,
    verified_at =
      null,
    verified_by =
      null
  where id = v_reported_id
    and account_status <> 'banned';

  update public.verification_requests
  set
    status = 'pending',
    request_type = 'age_review',
    restriction_reason =
      'Suspected underage account',
    admin_note =
      'Government ID and selfie are required after an underage report',
    updated_at = now()
  where user_id = v_reported_id
    and status = 'pending';

  if not found then
    insert into public.verification_requests (
      user_id,
      status,
      request_type,
      restriction_reason,
      admin_note
    )
    values (
      v_reported_id,
      'pending',
      'age_review',
      'Suspected underage account',
      'Government ID and selfie are required after an underage report'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists
  reports_restrict_underage_member
on public.reports;

create trigger
  reports_restrict_underage_member
after insert
on public.reports
for each row
execute procedure
  public.restrict_reported_underage_member();

-- =========================================================
-- RESTRICTIVE RLS ENFORCEMENT
-- =========================================================
--
-- Restrictive policies are combined with existing policies
-- using AND logic. Existing ownership and match rules remain.

alter table public.profiles
enable row level security;

drop policy if exists
  "Verification required to browse profiles"
on public.profiles;

create policy
  "Verification required to browse profiles"
on public.profiles
as restrictive
for select
to authenticated
using (
  id = auth.uid()
  or public.is_afrolove_admin(auth.uid())
  or public.verification_access_allowed(
    auth.uid()
  )
);


alter table public.interactions
enable row level security;

drop policy if exists
  "Verification required to view interactions"
on public.interactions;

create policy
  "Verification required to view interactions"
on public.interactions
as restrictive
for select
to authenticated
using (
  public.is_afrolove_admin(
    auth.uid()
  )
  or public.verification_access_allowed(
    auth.uid()
  )
);


alter table public.matches
enable row level security;

drop policy if exists
  "Verification required to view matches"
on public.matches;

create policy
  "Verification required to view matches"
on public.matches
as restrictive
for select
to authenticated
using (
  public.is_afrolove_admin(
    auth.uid()
  )
  or public.verification_access_allowed(
    auth.uid()
  )
);


alter table public.messages
enable row level security;

drop policy if exists
  "Verification required to view messages"
on public.messages;

create policy
  "Verification required to view messages"
on public.messages
as restrictive
for select
to authenticated
using (
  public.is_afrolove_admin(
    auth.uid()
  )
  or public.verification_access_allowed(
    auth.uid()
  )
);


-- =========================================================
-- EVIDENCE RETENTION METADATA
-- =========================================================

alter table public.verification_requests
  add column if not exists
    evidence_delete_after timestamptz,
  add column if not exists
    evidence_deleted_at timestamptz;

create index if not exists
  verification_requests_evidence_retention_idx
on public.verification_requests (
  evidence_delete_after
)
where evidence_deleted_at is null;


-- =========================================================
-- AUDITED ADMIN REVIEW WRAPPER
-- =========================================================
--
-- Preserve the existing tested review logic as the core
-- function, then place an audited wrapper around it.

alter function
  public.admin_review_layered_verification(
    uuid,
    text,
    text
  )
rename to
  admin_review_layered_verification_core;

revoke all on function
  public.admin_review_layered_verification_core(
    uuid,
    text,
    text
  )
from public;

revoke all on function
  public.admin_review_layered_verification_core(
    uuid,
    text,
    text
  )
from authenticated;


create function
  public.admin_review_layered_verification(
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
  v_member_id uuid;
begin
  if v_admin_id is null
    or not public.is_afrolove_admin(
      v_admin_id
    ) then
    raise exception
      'Admin access required';
  end if;

  select user_id
  into v_member_id
  from public.verification_requests
  where id = p_request_id;

  if v_member_id is null then
    raise exception
      'Verification request not found';
  end if;

  perform
    public.admin_review_layered_verification_core(
      p_request_id,
      p_decision,
      p_note
    );

  update public.verification_requests
  set evidence_delete_after =
    case
      when p_decision = 'underage'
        then now() + interval '90 days'

      when p_decision in (
        'approve_photo',
        'approve_id',
        'reject'
      )
        then now() + interval '30 days'

      else evidence_delete_after
    end
  where id = p_request_id;

  insert into public.admin_audit_logs (
    admin_id,
    action,
    target_user_id,
    metadata
  )
  values (
    v_admin_id,
    'layered_verification_' ||
      p_decision,
    v_member_id,
    jsonb_build_object(
      'request_id',
        p_request_id,
      'decision',
        p_decision,
      'note',
        nullif(
          left(
            btrim(coalesce(p_note, '')),
            500
          ),
          ''
        ),
      'reviewed_at',
        now()
    )
  );
end;
$$;

revoke all on function
  public.admin_review_layered_verification(
    uuid,
    text,
    text
  )
from public;

grant execute on function
  public.admin_review_layered_verification(
    uuid,
    text,
    text
  )
to authenticated;


comment on column
  public.verification_requests.evidence_delete_after
is
  'Operational review date for securely removing private verification evidence. Automatic file deletion requires the approved storage-retention worker.';


commit;
