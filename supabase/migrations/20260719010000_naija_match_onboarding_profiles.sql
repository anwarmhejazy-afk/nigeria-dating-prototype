alter table public.profiles
  add column if not exists country text not null default 'Nigeria',
  add column if not exists show_me text,
  add column if not exists relationship_goal text,
  add column if not exists lifestyle jsonb not null default '{"drinking":"Prefer not to say","smoking":"Prefer not to say","exercise":"Prefer not to say","children":"Prefer not to say","wants_children":"Prefer not to say"}'::jsonb,
  add column if not exists photo_urls text[] not null default '{}',
  add column if not exists profile_completion integer not null default 0,
  add column if not exists profile_visibility text not null default 'visible';

update public.profiles
set photo_urls = array[avatar_url]
where avatar_url is not null
  and cardinality(photo_urls) = 0;

update public.profiles
set profile_completion = case
  when onboarding_completed then greatest(profile_completion, 70)
  else profile_completion
end;

create index if not exists profiles_discovery_city_idx
on public.profiles (city, onboarding_completed)
where onboarding_completed = true;

create index if not exists profiles_discovery_preferences_idx
on public.profiles (gender, show_me)
where onboarding_completed = true;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'profile-photos',
  'profile-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Profile photos are publicly readable" on storage.objects;
create policy "Profile photos are publicly readable"
on storage.objects for select
to public
using (bucket_id = 'profile-photos');

drop policy if exists "Members can upload their profile photos" on storage.objects;
create policy "Members can upload their profile photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Members can update their profile photos" on storage.objects;
create policy "Members can update their profile photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Members can delete their profile photos" on storage.objects;
create policy "Members can delete their profile photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
