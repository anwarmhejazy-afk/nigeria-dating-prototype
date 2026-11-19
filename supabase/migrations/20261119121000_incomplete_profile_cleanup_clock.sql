begin;

alter table public.profiles
  add column if not exists incomplete_cleanup_started_at timestamptz;

-- IMPORTANT:
-- Existing incomplete profiles receive a fresh grace period
-- from the day this feature is installed.
update public.profiles
set incomplete_cleanup_started_at = now()
where incomplete_cleanup_started_at is null;

alter table public.profiles
  alter column incomplete_cleanup_started_at
  set default now();

alter table public.profiles
  alter column incomplete_cleanup_started_at
  set not null;

create index if not exists profiles_incomplete_cleanup_idx
on public.profiles (
  incomplete_cleanup_started_at,
  created_at
)
where onboarding_completed = false;

create or replace function public.reset_incomplete_profile_cleanup_clock()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  /*
   * If a previously completed profile is deliberately
   * returned to incomplete onboarding, start a fresh
   * cleanup grace period.
   */
  if old.onboarding_completed = true
     and new.onboarding_completed = false then
    new.incomplete_cleanup_started_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_reset_incomplete_cleanup_clock
on public.profiles;

create trigger profiles_reset_incomplete_cleanup_clock
before update of onboarding_completed
on public.profiles
for each row
execute function public.reset_incomplete_profile_cleanup_clock();

commit;
