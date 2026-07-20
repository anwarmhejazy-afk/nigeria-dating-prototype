import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const { data, error } = await supabase.rpc("activate_vip_boost");
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true, endsAt: data });
}
