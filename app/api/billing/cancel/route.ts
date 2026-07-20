import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const { error } = await supabase.rpc("cancel_membership_at_period_end");
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
