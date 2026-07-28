import { createClient } from "@/lib/supabase/server";

type NotificationPatch = {
  action?: "seen" | "read";
  ids?: unknown;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id,type,title,body,url,seen_at,read_at,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ notifications: data || [] });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  let payload: NotificationPatch = {};
  try {
    payload = await request.json();
  } catch {
    // Legacy clients sent an empty body and marked everything read.
  }

  const ids = Array.isArray(payload.ids)
    ? payload.ids.filter((value): value is string => typeof value === "string")
    : [];
  const now = new Date().toISOString();

  if (payload.action === "seen") {
    let query = supabase
      .from("notifications")
      .update({ seen_at: now })
      .eq("user_id", user.id)
      .is("seen_at", null);

    if (ids.length) query = query.in("id", ids);
    const { error } = await query;

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ success: true });
  }

  let query = supabase
    .from("notifications")
    .update({ seen_at: now, read_at: now })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (ids.length) query = query.in("id", ids);
  const { error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ success: true });
}
