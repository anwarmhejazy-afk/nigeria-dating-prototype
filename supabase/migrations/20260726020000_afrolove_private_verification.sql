-- AfroLove layered verification: private evidence and review workflow.
--
-- Phase 2 does not yet enforce verification for Discovery, likes, matching
-- or messaging. Those restrictions will be activated only after testing.

create or replace function public.submit_layered_verification(
  p_selfie_path text,
  p_id_document_path text default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_request_id uuid;
  v_date_of_birth date;
  v_id_status text;
  v_updated integer := 0;
  v_request_type text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select
    date_of_birth,
    coalesce(id_verification_status, 'not_required')
  into
    v_date_of_birth,
    v_id_status
  from public.profiles
  where id = v_user_id;

  if v_date_of_birth is null then
    raise exception
      'Add your date of birth before requesting verification';
  end if;

  if v_date_of_birth >
    (current_date - interval '18 years')::date then

    update public.profiles
    set
      age_verification_status = 'blocked',
      verification_restricted = true,
      verification_restriction_reason =
        'AfroLove is available only to adults aged 18 or older',
      account_status = 'banned',
      profile_visibility = 'hidden',
      is_online = false,
      is_verified = false
    where id = v_user_id;

    raise exception
      'AfroLove is available only to adults aged 18 or older';
  end if;

  if nullif(btrim(coalesce(p_selfie_path, '')), '') is null
    or p_selfie_path not like v_user_id::text || '/%' then
    raise exception
      'A valid selfie from your private verification folder is required';
  end if;

  v_request_type := case
    when v_id_status in (
      'required',
      'pending',
      'reviewing',
      'rejected'
    )
      then 'identity'
    else 'photo'
  end;

  if v_request_type = 'identity'
    and (
      nullif(
        btrim(coalesce(p_id_document_path, '')),
        ''
      ) is null
      or p_id_document_path not like
        v_user_id::text || '/%'
    ) then
    raise exception
      'Government ID is required for this verification review';
  end if;

  update public.verification_requests
  set
    request_type = v_request_type,
    selfie_path = p_selfie_path,
    id_document_path = nullif(
      btrim(coalesce(p_id_document_path, '')),
      ''
    ),
    claimed_date_of_birth = v_date_of_birth,
    member_note = nullif(
      left(btrim(coalesce(p_note, '')), 1000),
      ''
    ),
    admin_note = null,
    submitted_at = now(),
    updated_at = now()
  where user_id = v_user_id
    and status = 'pending'
  returning id into v_request_id;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    insert into public.verification_requests (
      user_id,
      status,
      request_type,
      selfie_path,
      id_document_path,
      claimed_date_of_birth,
      member_note,
      submitted_at
    )
    values (
      v_user_id,
      'pending',
      v_request_type,
      p_selfie_path,
      nullif(
        btrim(coalesce(p_id_document_path, '')),
        ''
      ),
      v_date_of_birth,
      nullif(
        left(btrim(coalesce(p_note, '')), 1000),
        ''
      ),
      now()
    )
    returning id into v_request_id;
  end if;

  update public.profiles
  set
    age_verification_status = 'confirmed',
    age_verified_at = coalesce(age_verified_at, now()),
    photo_verification_status = 'reviewing',
    id_verification_status = case
      when v_request_type = 'identity'
        then 'reviewing'
      else id_verification_status
    end,
    verification_restricted = true,
    verification_restriction_reason = case
      when v_request_type = 'identity'
        then 'Identity verification is under review'
      else 'Photo verification is under review'
    end
  where id = v_user_id;

  return v_request_id;
end;
$$;

revoke all on function
  public.submit_layered_verification(text, text, text)
from public;

grant execute on function
  public.submit_layered_verification(text, text, text)
to authenticated;


create or replace function public.admin_review_layered_verification(
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
  v_id_path text;
  v_current_id_status text;
begin
  if v_admin_id is null
    or not public.is_afrolove_admin(v_admin_id) then
    raise exception 'Admin access required';
  end if;

  if p_decision not in (
    'approve_photo',
    'require_id',
    'approve_id',
    'reject',
    'underage'
  ) then
    raise exception 'Invalid verification decision';
  end if;

  select
    user_id,
    id_document_path
  into
    v_member_id,
    v_id_path
  from public.verification_requests
  where id = p_request_id;

  if v_member_id is null then
    raise exception 'Verification request not found';
  end if;

  select coalesce(
    id_verification_status,
    'not_required'
  )
  into v_current_id_status
  from public.profiles
  where id = v_member_id;

  if p_decision = 'approve_photo' then

    if v_current_id_status in (
      'required',
      'pending',
      'reviewing',
      'rejected'
    ) then
      raise exception
        'Government ID approval is required for this member';
    end if;

    update public.verification_requests
    set
      status = 'approved',
      admin_note = nullif(
        left(btrim(coalesce(p_note, '')), 2000),
        ''
      ),
      reviewed_by = v_admin_id,
      reviewed_at = now(),
      updated_at = now()
    where id = p_request_id;

    update public.profiles
    set
      age_verification_status = 'confirmed',
      photo_verification_status = 'approved',
      age_verified_at = coalesce(age_verified_at, now()),
      photo_verified_at = now(),
      verification_restricted = false,
      verification_restriction_reason = null,
      is_verified = true,
      verified_at = now(),
      verified_by = v_admin_id
    where id = v_member_id;

  elsif p_decision = 'require_id' then

    update public.verification_requests
    set
      status = 'pending',
      request_type = 'identity',
      admin_note = coalesce(
        nullif(
          left(btrim(coalesce(p_note, '')), 2000),
          ''
        ),
        'Government ID is required to complete this review'
      ),
      reviewed_by = v_admin_id,
      reviewed_at = now(),
      updated_at = now()
    where id = p_request_id;

    update public.profiles
    set
      photo_verification_status = 'reviewing',
      id_verification_status = 'required',
      verification_restricted = true,
      verification_restriction_reason =
        'Government ID verification required',
      is_verified = false
    where id = v_member_id;

  elsif p_decision = 'approve_id' then

    if nullif(btrim(coalesce(v_id_path, '')), '') is null then
      raise exception 'No government ID was submitted';
    end if;

    update public.verification_requests
    set
      status = 'approved',
      admin_note = nullif(
        left(btrim(coalesce(p_note, '')), 2000),
        ''
      ),
      reviewed_by = v_admin_id,
      reviewed_at = now(),
      updated_at = now()
    where id = p_request_id;

    update public.profiles
    set
      age_verification_status = 'confirmed',
      photo_verification_status = 'approved',
      id_verification_status = 'approved',
      age_verified_at = coalesce(age_verified_at, now()),
      photo_verified_at = coalesce(
        photo_verified_at,
        now()
      ),
      id_verified_at = now(),
      verification_restricted = false,
      verification_restriction_reason = null,
      is_verified = true,
      verified_at = now(),
      verified_by = v_admin_id
    where id = v_member_id;

  elsif p_decision = 'reject' then

    update public.verification_requests
    set
      status = 'rejected',
      admin_note = coalesce(
        nullif(
          left(btrim(coalesce(p_note, '')), 2000),
          ''
        ),
        'Verification evidence was not accepted'
      ),
      reviewed_by = v_admin_id,
      reviewed_at = now(),
      updated_at = now()
    where id = p_request_id;

    update public.profiles
    set
      photo_verification_status = 'rejected',
      id_verification_status = case
        when id_verification_status in (
          'required',
          'pending',
          'reviewing'
        )
          then 'rejected'
        else id_verification_status
      end,
      verification_restricted = true,
      verification_restriction_reason = coalesce(
        nullif(
          left(btrim(coalesce(p_note, '')), 500),
          ''
        ),
        'Verification evidence was not accepted'
      ),
      is_verified = false,
      verified_at = null,
      verified_by = null
    where id = v_member_id;

  elsif p_decision = 'underage' then

    update public.verification_requests
    set
      status = 'rejected',
      admin_note = coalesce(
        nullif(
          left(btrim(coalesce(p_note, '')), 2000),
          ''
        ),
        'Confirmed or strongly suspected underage account'
      ),
      reviewed_by = v_admin_id,
      reviewed_at = now(),
      updated_at = now()
    where id = p_request_id;

    update public.profiles
    set
      age_verification_status = 'blocked',
      photo_verification_status = 'rejected',
      id_verification_status = 'rejected',
      verification_restricted = true,
      verification_restriction_reason =
        'AfroLove is available only to adults aged 18 or older',
      account_status = 'banned',
      moderation_note = coalesce(
        nullif(
          left(btrim(coalesce(p_note, '')), 500),
          ''
        ),
        'Underage account'
      ),
      profile_visibility = 'hidden',
      is_online = false,
      is_verified = false,
      verified_at = null,
      verified_by = null
    where id = v_member_id;

  end if;
end;
$$;

revoke all on function
  public.admin_review_layered_verification(uuid, text, text)
from public;

grant execute on function
  public.admin_review_layered_verification(uuid, text, text)
to authenticated;
