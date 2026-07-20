import { isAdmin } from "@/lib/admin";
import { sendPushToUser } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  if (!(await isAdmin(supabase))) return Response.json({ error: "Admin access required." }, { status: 403 });

  let payload: { status?: unknown; action?: unknown; note?: unknown; durationHours?: unknown };
  try { payload = await request.json(); } catch { return Response.json({ error: "Invalid request body." }, { status: 400 }); }
  const status = typeof payload.status === "string" ? payload.status : "";
  const action = typeof payload.action === "string" ? payload.action : "none";
  const note = typeof payload.note === "string" ? payload.note.trim() : "";
  const durationHours = typeof payload.durationHours === "number" && Number.isFinite(payload.durationHours) ? Math.round(payload.durationHours) : null;

  const { data: report } = await supabase
    .from("reports")
    .select("reporter_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.rpc("admin_resolve_report", {
    p_report_id: id,
    p_status: status,
    p_action: action,
    p_note: note || null,
    p_duration_hours: durationHours,
  });
  if (error) return Response.json({ error: error.message || "Unable to update report." }, { status: 400 });

  if (report?.reporter_id && ["resolved", "dismissed"].includes(status)) {
    await sendPushToUser(supabase, report.reporter_id, {
      type: "safety",
      title: "Your safety report was reviewed",
      body: status === "resolved"
        ? "AfroLove’s safety team completed its review and took appropriate action."
        : "AfroLove’s safety team completed its review. No further action was taken based on the submitted evidence.",
      url: "/app",
      tag: `safety-result-${id}`,
      metadata: { reportId: id, status },
    });
  }

  return Response.json({ success: true });
}
