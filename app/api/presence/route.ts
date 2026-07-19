import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  let online = true;

  try {
    const payload = (await request.json()) as { online?: unknown };
    online = payload.online !== false;
  } catch {
    // A missing body is treated as an online heartbeat.
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      is_online: online,
      last_seen: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return Response.json(
      { error: error.message || "Unable to update presence." },
      { status: 400 },
    );
  }

  return Response.json({ success: true });
}
