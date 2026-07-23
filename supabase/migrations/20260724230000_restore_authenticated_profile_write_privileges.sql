-- AfroLove profile publishing permission repair.
--
-- Row Level Security remains enabled and continues to decide which rows a
-- signed-in member may access. These table privileges only restore the SQL
-- operations required by the existing member-owned profile policies.

grant usage on schema public to authenticated;

grant select, insert, update
on table public.profiles
to authenticated;
