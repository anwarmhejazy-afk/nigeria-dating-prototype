import { isAdmin } from "@/lib/admin";
import { sendPushToUser } from "@/lib/push";
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

  const { data: verification } = await supabase
    .from("verification_requests")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.rpc("admin_review_verification", {
    p_request_id: id,
    p_decision: decision,
    p_note: note || null,
  });
  if (error) return Response.json({ error: error.message || "Unable to update verification request." }, { status: 400 });

  if (verification?.user_id) {
    const approved = decision === "approved";
    await sendPushToUser(supabase, verification.user_id, {
      type: "verification",
      title: approved ? "Your AfroLove profile is verified" : "Verification request updated",
      body: approved
        ? "Your verified badge is now active."
        : note || "Your verification request has been reviewed.",
      url: "/app?tab=profile",
      tag: `verification-result-${id}`,
      metadata: { requestId: id, decision },
    });
  }

  return Response.json({ success: true });
}
