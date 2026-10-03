begin;

create table if not exists public.profile_reminder_attempts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  admin_id uuid references public.profiles(id) on delete set null,
  delivery_state text not null default 'sending' check (delivery_state in ('sending', 'sent', 'failed')),
  requested_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists profile_reminder_attempts_member_time
on public.profile_reminder_attempts(member_id, requested_at desc);
alter table public.profile_reminder_attempts enable row level security;
revoke all on public.profile_reminder_attempts from anon, authenticated;

-- Service role only. The API authenticates the caller; this function also
-- checks their staff membership. Locking the target row serializes concurrent
-- requests from all admins before reserving the 24-hour cooldown.
create or replace function public.admin_reserve_profile_reminder(p_member_id uuid, p_admin_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_member public.profiles%rowtype;
  v_latest timestamptz;
  v_id uuid;
  v_email text;
begin
  if not exists (select 1 from public.admin_members where user_id = p_admin_id and is_active = true) then
    raise exception 'Admin access required';
  end if;
  select * into v_member from public.profiles where id = p_member_id for update;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if exists (select 1 from public.admin_members where user_id = p_member_id and is_active = true)
    or v_member.account_status in ('suspended', 'banned')
    or v_member.photo_verification_status = 'reviewing'
    or v_member.id_verification_status = 'reviewing'
    or (v_member.onboarding_completed and v_member.verification_restricted = false) then
    return jsonb_build_object('status', 'ineligible');
  end if;
  select email into v_email from auth.users where id = p_member_id;
  -- Never send to an arbitrary profile field or an address different from
  -- the account shown to the administrator.
  if nullif(btrim(v_email), '') is null
    or lower(btrim(v_email)) is distinct from lower(btrim(v_member.email)) then
    return jsonb_build_object('status', 'missing_email');
  end if;
  select max(requested_at) into v_latest from public.profile_reminder_attempts where member_id = p_member_id;
  if v_latest > now() - interval '24 hours' then
    return jsonb_build_object('status', 'cooldown', 'retryAt', v_latest + interval '24 hours');
  end if;
  insert into public.profile_reminder_attempts(member_id, admin_id) values (p_member_id, p_admin_id) returning id into v_id;
  insert into public.admin_audit_logs(admin_id, action, target_user_id, metadata)
  values (p_admin_id, 'profile_reminder_requested', p_member_id, jsonb_build_object('reminder_id', v_id, 'delivery_state', 'sending'));
  return jsonb_build_object('status', 'reserved', 'reminderId', v_id, 'email', btrim(v_email), 'displayName', v_member.display_name, 'onboardingCompleted', v_member.onboarding_completed);
end;
$$;

create or replace function public.admin_finish_profile_reminder(p_reminder_id uuid, p_delivery_state text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_attempt public.profile_reminder_attempts%rowtype;
begin
  if p_delivery_state not in ('sent', 'failed') then raise exception 'Invalid outcome'; end if;
  update public.profile_reminder_attempts set delivery_state = p_delivery_state, finished_at = now()
  where id = p_reminder_id and delivery_state = 'sending' returning * into v_attempt;
  if not found then return; end if;
  insert into public.admin_audit_logs(admin_id, action, target_user_id, metadata)
  values (v_attempt.admin_id, 'profile_reminder_' || p_delivery_state, v_attempt.member_id,
    jsonb_build_object('reminder_id', p_reminder_id, 'delivery_state', p_delivery_state, 'inbox_delivery_confirmed', false));
end;
$$;
revoke all on function public.admin_reserve_profile_reminder(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_finish_profile_reminder(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_reserve_profile_reminder(uuid, uuid) to service_role;
grant execute on function public.admin_finish_profile_reminder(uuid, text) to service_role;
commit;
