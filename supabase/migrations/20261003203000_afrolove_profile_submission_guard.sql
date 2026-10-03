-- Draft registrations remain editable. Completed dating profiles must satisfy
-- the same requirements already enforced by the ProfileEditor form.
begin;

create or replace function public.enforce_profile_submission_requirements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.admin_members where user_id = new.id and is_active = true) then
    return new;
  end if;

  if new.onboarding_completed is not true then
    new.profile_visibility := 'hidden';
    new.is_online := false;
    new.verification_restricted := true;
    return new;
  end if;

  if length(btrim(coalesce(new.display_name, ''))) < 2
    or new.date_of_birth is null
    or new.date_of_birth > (current_date - interval '18 years')::date
    or coalesce(new.gender, '') not in ('Man', 'Woman', 'Non-binary')
    or coalesce(new.show_me, '') not in ('Men', 'Women', 'Everyone')
    or nullif(btrim(coalesce(new.country, '')), '') is null
    or nullif(btrim(coalesce(new.state, '')), '') is null
    or nullif(btrim(coalesce(new.city, '')), '') is null
    or coalesce(cardinality(new.photo_urls), 0) < 1
    or length(btrim(coalesce(new.bio, ''))) < 30
    or nullif(btrim(coalesce(new.occupation, '')), '') is null
    or new.height_cm is null or new.height_cm < 120 or new.height_cm > 230
    or coalesce(cardinality(new.languages), 0) < 1
    or nullif(btrim(coalesce(new.relationship_goal, '')), '') is null
    or length(btrim(coalesce(new.looking_for, ''))) < 20
    or coalesce(cardinality(new.interests), 0) < 3 then
    raise exception 'Complete all required profile fields before submitting. Save a draft to finish later.';
  end if;

  -- Only accept at least one actual uploaded photo owned by this member.
  if not exists (
    select 1 from unnest(new.photo_urls) as photo(url)
    join storage.objects as object
      on object.bucket_id = 'profile-photos'
      and split_part(photo.url, '/storage/v1/object/public/profile-photos/', 2) = object.name
    where split_part(object.name, '/', 1) = new.id::text
  ) then
    raise exception 'Upload at least one profile photo before submitting.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_profile_submission_requirements() from public;

-- Alphabetical ordering runs this after profiles_enforce_layered_verification.
drop trigger if exists profiles_validate_submission on public.profiles;
create trigger profiles_validate_submission
before insert or update of onboarding_completed, display_name, date_of_birth,
  gender, show_me, country, state, city, photo_urls, bio, occupation,
  height_cm, languages, relationship_goal, looking_for, interests
on public.profiles
for each row execute function public.enforce_profile_submission_requirements();

-- Prevent direct RPC calls from putting unfinished registrations in the queue.
create or replace function public.enforce_verification_submission_requirements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = new.user_id and onboarding_completed = true
      and account_status not in ('suspended', 'banned')
  ) then
    raise exception 'Complete your profile before submitting verification.';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'verification-evidence' and name = new.selfie_path
      and split_part(name, '/', 1) = new.user_id::text
  ) then
    raise exception 'Upload your private verification selfie before submitting.';
  end if;
  if nullif(new.id_document_path, '') is not null and not exists (
    select 1 from storage.objects
    where bucket_id = 'verification-evidence' and name = new.id_document_path
      and split_part(name, '/', 1) = new.user_id::text
  ) then
    raise exception 'Upload your private identity document before submitting.';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_verification_submission_requirements() from public;
drop trigger if exists verification_requests_validate_submission on public.verification_requests;
create trigger verification_requests_validate_submission
before insert or update of selfie_path, id_document_path, submitted_at
on public.verification_requests
for each row execute function public.enforce_verification_submission_requirements();

commit;
