create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  likes_enabled boolean not null default true,
  matches_enabled boolean not null default true,
  messages_enabled boolean not null default true,
  safety_enabled boolean not null default true,
  verification_enabled boolean not null default true,
  marketing_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  is_active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('like', 'match', 'message', 'safety', 'verification', 'system')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 500),
  url text not null default '/app',
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.app_private_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.notification_preferences (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

insert into public.app_private_settings (key, value)
values ('push_delivery_secret_hash', '76887510fbb627ba9fb3d8a926020787fd42845d869eb0bf33faf7e859c813ca')
on conflict (key) do update set value = excluded.value, updated_at = now();

create index if not exists push_subscriptions_user_active_idx
on public.push_subscriptions (user_id, is_active, updated_at desc);

create index if not exists notifications_user_created_idx
on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
on public.notifications (user_id, created_at desc)
where read_at is null;

alter table public.notification_preferences enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notifications enable row level security;
alter table public.app_private_settings enable row level security;

drop policy if exists "Members can view their notification preferences" on public.notification_preferences;
create policy "Members can view their notification preferences"
on public.notification_preferences for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Members can update their notification preferences" on public.notification_preferences;
create policy "Members can update their notification preferences"
on public.notification_preferences for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Members can create their notification preferences" on public.notification_preferences;
create policy "Members can create their notification preferences"
on public.notification_preferences for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Members can manage their push subscriptions" on public.push_subscriptions;
create policy "Members can manage their push subscriptions"
on public.push_subscriptions for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Members can view their notifications" on public.notifications;
create policy "Members can view their notifications"
on public.notifications for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Members can update their notifications" on public.notifications;
create policy "Members can update their notifications"
on public.notifications for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- No direct member access to server-only settings.
revoke all on public.app_private_settings from anon, authenticated;

grant select, insert, update on public.notification_preferences to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select, update on public.notifications to authenticated;

create or replace function public.ensure_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_create_notification_preferences on public.profiles;
create trigger profiles_create_notification_preferences
after insert on public.profiles
for each row execute function public.ensure_notification_preferences();

create or replace function public.notification_settings_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function public.notification_settings_updated_at();

drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row execute function public.notification_settings_updated_at();

create or replace function public.push_delivery_secret_is_valid(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_private_settings
    where key = 'push_delivery_secret_hash'
      and value = encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex')
  );
$$;

revoke all on function public.push_delivery_secret_is_valid(text) from public;


create or replace function public.create_notification_for_delivery(
  p_recipient_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_url text,
  p_metadata jsonb,
  p_delivery_secret text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enabled boolean := false;
  v_id uuid;
begin
  if not public.push_delivery_secret_is_valid(p_delivery_secret) then
    raise exception 'Invalid delivery credentials';
  end if;

  if p_type not in ('like', 'match', 'message', 'safety', 'verification', 'system') then
    raise exception 'Invalid notification type';
  end if;

  select case p_type
    when 'like' then likes_enabled
    when 'match' then matches_enabled
    when 'message' then messages_enabled
    when 'safety' then safety_enabled
    when 'verification' then verification_enabled
    else true
  end
  into v_enabled
  from public.notification_preferences
  where user_id = p_recipient_id;

  if coalesce(v_enabled, true) = false then
    return null;
  end if;

  insert into public.notifications (user_id, type, title, body, url, metadata)
  values (
    p_recipient_id,
    p_type,
    left(p_title, 120),
    left(p_body, 500),
    coalesce(nullif(p_url, ''), '/app'),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_notification_for_delivery(uuid, text, text, text, text, jsonb, text) from public;
grant execute on function public.create_notification_for_delivery(uuid, text, text, text, text, jsonb, text) to authenticated;

create or replace function public.get_push_subscriptions_for_delivery(
  p_recipient_id uuid,
  p_delivery_secret text
)
returns table(endpoint text, p256dh text, auth text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.push_delivery_secret_is_valid(p_delivery_secret) then
    raise exception 'Invalid delivery credentials';
  end if;

  return query
  select s.endpoint, s.p256dh, s.auth
  from public.push_subscriptions s
  where s.user_id = p_recipient_id
    and s.is_active = true;
end;
$$;

revoke all on function public.get_push_subscriptions_for_delivery(uuid, text) from public;
grant execute on function public.get_push_subscriptions_for_delivery(uuid, text) to authenticated;

create or replace function public.disable_push_subscription_for_delivery(
  p_endpoint text,
  p_delivery_secret text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.push_delivery_secret_is_valid(p_delivery_secret) then
    raise exception 'Invalid delivery credentials';
  end if;

  update public.push_subscriptions
  set is_active = false, updated_at = now()
  where endpoint = p_endpoint;
end;
$$;

revoke all on function public.disable_push_subscription_for_delivery(text, text) from public;
grant execute on function public.disable_push_subscription_for_delivery(text, text) to authenticated;

create or replace function public.get_admin_ids_for_delivery(p_delivery_secret text)
returns table(user_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.push_delivery_secret_is_valid(p_delivery_secret) then
    raise exception 'Invalid delivery credentials';
  end if;

  return query
  select a.user_id
  from public.admin_members a
  where a.is_active = true;
end;
$$;

revoke all on function public.get_admin_ids_for_delivery(text) from public;
grant execute on function public.get_admin_ids_for_delivery(text) to authenticated;

-- Enable realtime delivery for in-app notification badges when possible.
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;

create or replace function public.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text
)
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

  insert into public.push_subscriptions (
    user_id, endpoint, p256dh, auth, user_agent, is_active, last_used_at
  )
  values (
    v_user_id,
    p_endpoint,
    p_p256dh,
    p_auth,
    left(p_user_agent, 500),
    true,
    now()
  )
  on conflict (endpoint)
  do update set
    user_id = v_user_id,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    user_agent = excluded.user_agent,
    is_active = true,
    last_used_at = now(),
    updated_at = now();
end;
$$;

revoke all on function public.register_push_subscription(text, text, text, text) from public;
grant execute on function public.register_push_subscription(text, text, text, text) to authenticated;

create or replace function public.unregister_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.push_subscriptions
  set is_active = false, updated_at = now()
  where user_id = auth.uid()
    and (p_endpoint is null or p_endpoint = '' or endpoint = p_endpoint);
$$;

revoke all on function public.unregister_push_subscription(text) from public;
grant execute on function public.unregister_push_subscription(text) to authenticated;
