import { createClient } from "@/lib/supabase/server";

const fields = [
  "likes_enabled",
  "matches_enabled",
  "messages_enabled",
  "safety_enabled",
  "verification_enabled",
  "marketing_enabled",
] as const;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });

  const { data, error } = await supabase
    .from("notification_preferences")
    .select(fields.join(","))
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ preferences: data });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });

  let payload: Record<string, unknown>;
  try { payload = await request.json(); } catch { return Response.json({ error: "Invalid request body." }, { status: 400 }); }

  const update: Record<string, boolean | string> = { user_id: user.id };
  for (const field of fields) {
    if (typeof payload[field] === "boolean") update[field] = payload[field] as boolean;
  }

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(update, { onConflict: "user_id" });

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
