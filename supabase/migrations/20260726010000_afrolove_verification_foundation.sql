-- AfroLove layered verification foundation.
--
-- Phase 1 is additive. Dating access is not restricted by this migration.
-- Full Discovery, matching and messaging enforcement will be activated only
-- after the member and administrator verification screens are tested.

alter table public.profiles
  add column if not exists age_verification_status text not null default 'pending',
  add column if not exists photo_verification_status text not null default 'pending',
  add column if not exists id_verification_status text not null default 'not_required',
  add column if not exists verification_restricted boolean not null default false,
  add column if not exists verification_restriction_reason text,
  add column if not exists age_verified_at timestamptz,
  add column if not exists photo_verified_at timestamptz,
  add column if not exists id_verified_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_age_verification_status_check;

alter table public.profiles
  add constraint profiles_age_verification_status_check
  check (
    age_verification_status in (
      'pending',
      'confirmed',
      'review_required',
      'blocked'
    )
  );

alter table public.profiles
  drop constraint if exists profiles_photo_verification_status_check;

alter table public.profiles
  add constraint profiles_photo_verification_status_check
  check (
    photo_verification_status in (
      'pending',
      'reviewing',
      'approved',
      'rejected'
    )
  );

alter table public.profiles
  drop constraint if exists profiles_id_verification_status_check;

alter table public.profiles
  add constraint profiles_id_verification_status_check
  check (
    id_verification_status in (
      'not_required',
      'required',
      'pending',
      'reviewing',
      'approved',
      'rejected'
    )
  );

alter table public.verification_requests
  add column if not exists request_type text not null default 'photo',
  add column if not exists selfie_path text,
  add column if not exists id_document_path text,
  add column if not exists claimed_date_of_birth date,
  add column if not exists restriction_reason text,
  add column if not exists submitted_at timestamptz;

alter table public.verification_requests
  drop constraint if exists verification_requests_request_type_check;

alter table public.verification_requests
  add constraint verification_requests_request_type_check
  check (
    request_type in (
      'photo',
      'age_review',
      'identity'
    )
  );

-- Existing adult DOBs are marked age-confirmed.
-- Existing verified badges are treated as approved photo verification.
update public.profiles
set
  age_verification_status = case
    when date_of_birth is null then 'pending'
    when date_of_birth <=
      (current_date - interval '18 years')::date
      then 'confirmed'
    else 'blocked'
  end,
  age_verified_at = case
    when date_of_birth is not null
      and date_of_birth <=
        (current_date - interval '18 years')::date
      then coalesce(age_verified_at, now())
    else age_verified_at
  end,
  photo_verification_status = case
    when is_verified = true then 'approved'
    else 'pending'
  end,
  photo_verified_at = case
    when is_verified = true
      then coalesce(photo_verified_at, now())
    else photo_verified_at
  end,
  verification_restricted = case
    when date_of_birth is not null
      and date_of_birth <=
        (current_date - interval '18 years')::date
      and is_verified = true
      then false
    else true
  end,
  verification_restriction_reason = case
    when date_of_birth is null
      then 'Date of birth confirmation required'
    when date_of_birth >
      (current_date - interval '18 years')::date
      then 'Member is under 18'
    when is_verified = false
      then 'Photo verification required'
    else null
  end;

create index if not exists
  profiles_verification_status_idx
on public.profiles (
  age_verification_status,
  photo_verification_status,
  id_verification_status,
  verification_restricted
);

create index if not exists
  verification_requests_type_status_idx
on public.verification_requests (
  request_type,
  status,
  created_at desc
);

-- Private verification evidence storage.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'verification-evidence',
  'verification-evidence',
  false,
  8388608,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists
  "Members can upload verification evidence"
on storage.objects;

create policy
  "Members can upload verification evidence"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'verification-evidence'
  and (storage.foldername(name))[1] =
    (select auth.uid())::text
);

drop policy if exists
  "Members can read their verification evidence"
on storage.objects;

create policy
  "Members can read their verification evidence"
on storage.objects for select
to authenticated
using (
  bucket_id = 'verification-evidence'
  and (
    (storage.foldername(name))[1] =
      (select auth.uid())::text
    or (select public.is_afrolove_admin())
  )
);

drop policy if exists
  "Members can update verification evidence"
on storage.objects;

create policy
  "Members can update verification evidence"
on storage.objects for update
to authenticated
using (
  bucket_id = 'verification-evidence'
  and (storage.foldername(name))[1] =
    (select auth.uid())::text
)
with check (
  bucket_id = 'verification-evidence'
  and (storage.foldername(name))[1] =
    (select auth.uid())::text
);

drop policy if exists
  "Members can delete verification evidence"
on storage.objects;

create policy
  "Members can delete verification evidence"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'verification-evidence'
  and (storage.foldername(name))[1] =
    (select auth.uid())::text
);

-- Store registration DOB in the member profile.
-- Full server-side registration enforcement is activated in Phase 3.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_date_of_birth date;
  v_age_status text := 'pending';
begin
  begin
    v_date_of_birth :=
      nullif(
        new.raw_user_meta_data ->> 'date_of_birth',
        ''
      )::date;
  exception when others then
    v_date_of_birth := null;
  end;

  if v_date_of_birth is not null then
    if v_date_of_birth <=
      (current_date - interval '18 years')::date then
      v_age_status := 'confirmed';
    else
      v_age_status := 'blocked';
    end if;
  end if;

  insert into public.profiles (
    id,
    email,
    display_name,
    avatar_url,
    date_of_birth,
    age_verification_status,
    age_verified_at,
    photo_verification_status,
    id_verification_status,
    verification_restricted,
    verification_restriction_reason
  )
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      ''
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    v_date_of_birth,
    v_age_status,
    case
      when v_age_status = 'confirmed' then now()
      else null
    end,
    'pending',
    'not_required',
    true,
    case
      when v_age_status = 'blocked'
        then 'Member is under 18'
      when v_age_status = 'confirmed'
        then 'Photo verification required'
      else 'Date of birth confirmation required'
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
