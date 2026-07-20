import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });

  const { data } = await supabase
    .from("push_subscriptions")
    .select("endpoint,is_active,updated_at")
    .eq("user_id", user.id)
    .eq("is_active", true);

  return Response.json({ subscribed: Boolean(data?.length), subscriptions: data || [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });

  let payload: {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
    userAgent?: unknown;
  };
  try { payload = await request.json(); } catch { return Response.json({ error: "Invalid request body." }, { status: 400 }); }

  const endpoint = typeof payload.endpoint === "string" ? payload.endpoint : "";
  const p256dh = typeof payload.keys?.p256dh === "string" ? payload.keys.p256dh : "";
  const auth = typeof payload.keys?.auth === "string" ? payload.keys.auth : "";
  const userAgent = typeof payload.userAgent === "string" ? payload.userAgent.slice(0, 500) : "";

  if (!endpoint || !p256dh || !auth) {
    return Response.json({ error: "Invalid push subscription." }, { status: 400 });
  }

  const { error } = await supabase.rpc("register_push_subscription", {
    p_endpoint: endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
    p_user_agent: userAgent,
  });

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });

  let payload: { endpoint?: unknown } = {};
  try { payload = await request.json(); } catch { /* optional */ }
  const endpoint = typeof payload.endpoint === "string" ? payload.endpoint : "";

  const { error } = await supabase.rpc("unregister_push_subscription", {
    p_endpoint: endpoint || null,
  });

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
