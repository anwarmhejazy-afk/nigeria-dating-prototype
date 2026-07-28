-- Preserve report case notes when an administrator profile is deleted.
-- This mirrors the production-safe fix already applied manually.

begin;

alter table if exists public.report_case_notes
  alter column admin_id drop not null;

alter table if exists public.report_case_notes
  drop constraint if exists report_case_notes_admin_id_fkey;

alter table if exists public.report_case_notes
  add constraint report_case_notes_admin_id_fkey
  foreign key (admin_id)
  references public.profiles(id)
  on delete set null;

commit;
