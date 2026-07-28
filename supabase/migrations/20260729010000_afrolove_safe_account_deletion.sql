begin;

-- Preserve minimum identity snapshots inside safety reports before
-- a member profile is removed. These snapshots are visible only to
-- administrators through the existing report RLS rules.
alter table public.reports
  add column if not exists
    reporter_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists
    reported_snapshot jsonb not null default '{}'::jsonb;

create or replace function
public.afrolove_report_profile_snapshot(
  p_user_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'id', p.id,
        'email', p.email,
        'display_name', p.display_name,
        'country', p.country,
        'city', p.city,
        'account_status', p.account_status,
        'is_verified', p.is_verified,
        'onboarding_completed', p.onboarding_completed,
        'created_at', p.created_at
      )
      from public.profiles p
      where p.id = p_user_id
    ),
    '{}'::jsonb
  );
$$;

revoke all on function
  public.afrolove_report_profile_snapshot(uuid)
from public;

update public.reports
set
  reporter_snapshot =
    case
      when reporter_snapshot = '{}'::jsonb
      then public.afrolove_report_profile_snapshot(
        reporter_id
      )
      else reporter_snapshot
    end,
  reported_snapshot =
    case
      when reported_snapshot = '{}'::jsonb
      then public.afrolove_report_profile_snapshot(
        reported_id
      )
      else reported_snapshot
    end;

create or replace function
public.capture_afrolove_report_snapshots()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.reporter_id is not null then
      new.reporter_snapshot :=
        public.afrolove_report_profile_snapshot(
          new.reporter_id
        );
    end if;

    if new.reported_id is not null then
      new.reported_snapshot :=
        public.afrolove_report_profile_snapshot(
          new.reported_id
        );
    end if;
  else
    if new.reporter_id is not null
       and (
         new.reporter_id is distinct from old.reporter_id
         or coalesce(new.reporter_snapshot, '{}'::jsonb)
            = '{}'::jsonb
       ) then
      new.reporter_snapshot :=
        public.afrolove_report_profile_snapshot(
          new.reporter_id
        );
    end if;

    if new.reported_id is not null
       and (
         new.reported_id is distinct from old.reported_id
         or coalesce(new.reported_snapshot, '{}'::jsonb)
            = '{}'::jsonb
       ) then
      new.reported_snapshot :=
        public.afrolove_report_profile_snapshot(
          new.reported_id
        );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists
  reports_capture_identity_snapshots
on public.reports;

create trigger
  reports_capture_identity_snapshots
before insert or update of
  reporter_id,
  reported_id
on public.reports
for each row
execute procedure
  public.capture_afrolove_report_snapshots();

-- Keep safety reports and their submitted text evidence after either
-- account is deleted. The profile links become null, while the private
-- snapshots above preserve the minimum moderation context.
alter table public.reports
  alter column reporter_id drop not null,
  alter column reported_id drop not null;

alter table public.reports
  drop constraint if exists
    reports_reporter_id_fkey;

alter table public.reports
  add constraint
    reports_reporter_id_fkey
  foreign key (reporter_id)
  references public.profiles(id)
  on delete set null;

alter table public.reports
  drop constraint if exists
    reports_reported_id_fkey;

alter table public.reports
  add constraint
    reports_reported_id_fkey
  foreign key (reported_id)
  references public.profiles(id)
  on delete set null;

comment on column
  public.reports.reporter_snapshot
is
  'Private moderation snapshot retained when the reporting account is deleted.';

comment on column
  public.reports.reported_snapshot
is
  'Private moderation snapshot retained when the reported account is deleted.';

commit;
