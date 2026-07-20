import { sendPushToAdmins } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  let payload: { note?: unknown } = {};
  try { payload = await request.json(); } catch { /* note is optional */ }
  const note = typeof payload.note === "string" ? payload.note.trim() : "";
  const { data, error } = await supabase.rpc("request_profile_verification", { p_note: note || null });
  if (error) return Response.json({ error: error.message || "Unable to request verification." }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  await sendPushToAdmins(supabase, {
    type: "verification",
    title: "New verification request",
    body: `${profile?.display_name || "A member"} requested profile verification.`,
    url: "/admin",
    tag: `verification-${data}`,
    metadata: { requestId: data, memberId: user.id },
  });

  return Response.json({ success: true, requestId: data });
}
