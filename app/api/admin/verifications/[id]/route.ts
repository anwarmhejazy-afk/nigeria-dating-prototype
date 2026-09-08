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
    const pushBody = approved
      ? "Your verified badge is now active."
      : note || "Your verification request has been reviewed.";

    await sendPushToUser(supabase, verification.user_id, {
      type: "verification",
      title: approved ? "Your AfroLove profile is verified" : "Verification request updated",
      body: pushBody,
      url: "/app?tab=profile",
      tag: `verification-result-${id}`,
      metadata: { requestId: id, decision },
    });

    const { data: member } = await supabase
      .from("profiles")
      .select("email,display_name")
      .eq("id", verification.user_id)
      .maybeSingle();

    if (member?.email) {
      const displayName =
        typeof member.display_name === "string" && member.display_name.trim()
          ? member.display_name.trim()
          : "AfroLove member";

      const subject = approved
        ? "Your AfroLove profile is verified"
        : "Your AfroLove verification request was updated";

      const heading = approved
        ? "You’re verified"
        : "Verification update";

      try {
        await sendAfroLoveEmail({
          to: member.email,
          subject,
          text: [
            `Hi ${displayName},`,
            "",
            pushBody,
            "",
            "You can review your profile and verification status in AfroLove.",
            "",
            "AfroLove Support",
            "support@afroloveapp.com",
          ].join("\n"),
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#171717;line-height:1.6">
              <h1 style="font-size:26px;margin-bottom:20px">${escapeHtml(heading)}</h1>
              <p>Hi ${escapeHtml(displayName)},</p>
              <p>${escapeHtml(pushBody)}</p>
              <p>You can review your profile and verification status in AfroLove.</p>
              <p style="margin-top:28px">AfroLove Support<br>support@afroloveapp.com</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("AfroLove verification-result email warning:", emailError);
      }
    }
  }

  return Response.json({ success: true });
}
