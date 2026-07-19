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
  return Response.json({ success: true, requestId: data });
}
