import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  if (!(await isAdmin(supabase))) return Response.json({ error: "Admin access required." }, { status: 403 });

  let payload: { decision?: unknown; note?: unknown };
  try { payload = await request.json(); } catch { return Response.json({ error: "Invalid request body." }, { status: 400 }); }
  const decision = typeof payload.decision === "string" ? payload.decision : "";
  const note = typeof payload.note === "string" ? payload.note.trim() : "";

  const { error } = await supabase.rpc("admin_review_verification", {
    p_request_id: id,
    p_decision: decision,
    p_note: note || null,
  });
  if (error) return Response.json({ error: error.message || "Unable to update verification request." }, { status: 400 });
  return Response.json({ success: true });
}
