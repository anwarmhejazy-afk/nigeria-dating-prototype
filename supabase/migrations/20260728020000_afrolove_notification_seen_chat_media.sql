begin;

-- Separate "seen in the panel" from "opened/read".
alter table public.notifications
  add column if not exists seen_at timestamptz;

create index if not exists notifications_user_unseen_idx
on public.notifications (user_id, created_at desc)
where seen_at is null;

-- Allow image messages to have an optional caption while preserving text rules.
alter table public.messages
  drop constraint if exists messages_body_check;

alter table public.messages
  drop constraint if exists messages_body_by_type_check;

alter table public.messages
  add constraint messages_body_by_type_check
  check (
    (
      message_type = 'text'
      and char_length(btrim(body)) between 1 and 2000
    )
    or
    (
      message_type in ('image', 'voice')
      and char_length(body) between 0 and 2000
    )
  );

-- Private storage for matched-member chat images.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'chat-media',
  'chat-media',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Matched members can view chat media"
on storage.objects;

create policy "Matched members can view chat media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-media'
  and exists (
    select 1
    from public.matches m
    where m.id::text = (storage.foldername(name))[1]
      and m.is_active = true
      and auth.uid() in (m.user_low, m.user_high)
  )
);

drop policy if exists "Matched members can upload chat media"
on storage.objects;

create policy "Matched members can upload chat media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[2] = auth.uid()::text
  and exists (
    select 1
    from public.matches m
    where m.id::text = (storage.foldername(name))[1]
      and m.is_active = true
      and auth.uid() in (m.user_low, m.user_high)
  )
);

drop policy if exists "Senders can delete their chat media"
on storage.objects;

create policy "Senders can delete their chat media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[2] = auth.uid()::text
);

commit;
