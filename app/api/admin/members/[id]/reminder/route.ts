import { isAdmin } from "@/lib/admin";
import { sendAfroLoveEmail } from "@/lib/email";
import { profileReminderEmail } from "@/lib/profile-reminder";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Reservation = {
  status: "reserved" | "cooldown" | "ineligible" | "missing_email" | "not_found";
  reminderId?: string;
  email?: string;
  displayName?: string;
  onboardingCompleted?: boolean;
  retryAt?: string;
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  if (!(await isAdmin(supabase))) return Response.json({ error: "Admin access required." }, { status: 403 });
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return Response.json({ error: "Invalid member." }, { status: 400 });
  }
  // No address from the browser is accepted: the selected member is resolved
  // inside the database before claiming the shared, per-member cooldown.
  let service: ReturnType<typeof createAdminClient>;
  try {
    service = createAdminClient();
  } catch {
    return Response.json({ error: "Reminder service is not configured. Check the server's Supabase service role key." }, { status: 503 });
  }
  const { data, error } = await service.rpc("admin_reserve_profile_reminder", {
    p_member_id: id, p_admin_id: user.id,
  });
  if (error || !data) {
    console.error("AfroLove reminder reservation failed", error?.code);
    return Response.json({ error: "Unable to prepare the reminder. Check that the reminder SQL migration is installed." }, { status: 503 });
  }
  const reservation = data as Reservation;
  if (reservation.status === "cooldown") {
    return Response.json({ error: "A reminder was already attempted for this member within 24 hours.", retryAt: reservation.retryAt }, { status: 429 });
  }
  if (reservation.status !== "reserved" || !reservation.reminderId || !reservation.email) {
    const message = reservation.status === "missing_email" ? "The profile email does not match a usable account email. Review the member before sending."
      : reservation.status === "not_found" ? "Member not found."
      : "This member does not need a profile reminder, is under review, or cannot be contacted through this action.";
    return Response.json({ error: message }, { status: reservation.status === "not_found" ? 404 : 409 });
  }
  const finalize = async (state: "sent" | "failed") => service.rpc("admin_finish_profile_reminder", {
    p_reminder_id: reservation.reminderId, p_delivery_state: state,
  });
  try {
    const result = await sendAfroLoveEmail({
      to: reservation.email,
      ...profileReminderEmail(reservation.displayName || "AfroLove member", Boolean(reservation.onboardingCompleted)),
    });
    if (!result.accepted?.length || result.rejected?.length) throw new Error("Email not accepted");
  } catch {
    const outcome = await finalize("failed");
    if (outcome.error) console.error("AfroLove reminder failure audit failed", outcome.error.code);
    return Response.json({ error: "The email could not be confirmed as accepted. Check the email configuration and server logs. The attempt is recorded; wait 24 hours before trying again." }, { status: 502 });
  }
  const outcome = await finalize("sent");
  if (outcome.error) {
    console.error("AfroLove reminder success audit failed", outcome.error.code);
    return Response.json({ success: true, auditWarning: true, message: "Email accepted for sending, but the final audit update failed. The original request remains recorded. Do not resend." });
  }
  return Response.json({ success: true, message: "Reminder email accepted for sending. Inbox delivery is not confirmed." });
}
