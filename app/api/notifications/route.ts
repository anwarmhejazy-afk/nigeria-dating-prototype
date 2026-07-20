import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });

  const { data, error } = await supabase
    .from("notifications")
    .select("id,type,title,body,url,read_at,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ notifications: data || [] });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });

  let payload: { ids?: unknown } = {};
  try { payload = await request.json(); } catch { /* mark all */ }
  const ids = Array.isArray(payload.ids)
    ? payload.ids.filter((value): value is string => typeof value === "string")
    : [];

  let query = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  if (ids.length) query = query.in("id", ids);
  const { error } = await query;

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
