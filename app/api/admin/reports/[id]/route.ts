import { isAdmin } from "@/lib/admin";
import { sendAfroLoveEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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
    const body = status === "resolved"
      ? "AfroLove’s safety team completed its review and took appropriate action."
      : "AfroLove’s safety team completed its review. No further action was taken based on the submitted evidence.";

    await sendPushToUser(supabase, report.reporter_id, {
      type: "safety",
      title: "Your safety report was reviewed",
      body,
      url: "/app",
      tag: `safety-result-${id}`,
      metadata: { reportId: id, status },
    });

    const { data: reporter } = await supabase
      .from("profiles")
      .select("email,display_name")
      .eq("id", report.reporter_id)
      .maybeSingle();

    if (reporter?.email) {
      const displayName =
        typeof reporter.display_name === "string" && reporter.display_name.trim()
          ? reporter.display_name.trim()
          : "AfroLove member";

      try {
        await sendAfroLoveEmail({
          to: reporter.email,
          subject: "Your AfroLove safety report was reviewed",
          text: [
            `Hi ${displayName},`,
            "",
            body,
            "",
            "For privacy and safety reasons, AfroLove may not be able to share details of action taken against another member.",
            "",
            "AfroLove Support",
            "support@afroloveapp.com",
          ].join("\n"),
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#171717;line-height:1.6">
              <h1 style="font-size:26px;margin-bottom:20px">Safety report reviewed</h1>
              <p>Hi ${escapeHtml(displayName)},</p>
              <p>${escapeHtml(body)}</p>
              <p>For privacy and safety reasons, AfroLove may not be able to share details of action taken against another member.</p>
              <p style="margin-top:28px">AfroLove Support<br>support@afroloveapp.com</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("AfroLove safety-result email warning:", emailError);
      }
    }
  }

  return Response.json({ success: true });
}
