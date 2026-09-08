import { isAdmin } from "@/lib/admin";
import { sendAfroLoveEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";

const allowedActions = new Set([
  "warn",
  "restrict_messaging",
  "suspend",
  "ban",
  "restore",
]);

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function emailCopy(action: string, durationHours: number | null) {
  switch (action) {
    case "warn":
      return {
        subject: "Important notice about your AfroLove account",
        heading: "Account warning",
        body:
          "An administrator has issued a warning on your AfroLove account. Please review AfroLove's safety and community expectations before continuing to use the service.",
      };
    case "restrict_messaging":
      return {
        subject: "Your AfroLove messaging access has been restricted",
        heading: "Messaging restricted",
        body: durationHours
          ? `Your ability to send messages on AfroLove has been restricted for approximately ${durationHours} hour${durationHours === 1 ? "" : "s"}.`
          : "Your ability to send messages on AfroLove has been temporarily restricted.",
      };
    case "suspend":
      return {
        subject: "Your AfroLove account has been suspended",
        heading: "Account suspended",
        body: durationHours
          ? `Your AfroLove account has been suspended for approximately ${durationHours} hour${durationHours === 1 ? "" : "s"}.`
          : "Your AfroLove account has been temporarily suspended.",
      };
    case "ban":
      return {
        subject: "Your AfroLove account has been banned",
        heading: "Account banned",
        body:
          "Your AfroLove account has been permanently banned. You can no longer use this account or create another AfroLove account using this email address.",
      };
    case "restore":
      return {
        subject: "Your AfroLove account has been restored",
        heading: "Account restored",
        body:
          "Your AfroLove account has been restored. You may sign in again, subject to any verification requirements that still apply to your profile.",
      };
    default:
      return null;
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  if (!(await isAdmin(supabase))) {
    return Response.json(
      { error: "Admin access required." },
      { status: 403 },
    );
  }

  const {
    data: targetIsAdmin,
    error: targetAdminError,
  } = await supabase.rpc("is_afrolove_admin", {
    p_user_id: id,
  });

  if (targetAdminError) {
    return Response.json(
      {
        error:
          targetAdminError.message ||
          "Unable to verify the target account.",
      },
      { status: 400 },
    );
  }

  if (targetIsAdmin) {
    return Response.json(
      {
        error:
          "Staff accounts cannot be moderated through Member management.",
      },
      { status: 400 },
    );
  }

  let payload: {
    action?: unknown;
    note?: unknown;
    durationHours?: unknown;
  };

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const action =
    typeof payload.action === "string" ? payload.action : "";
  const note =
    typeof payload.note === "string" ? payload.note.trim() : "";
  const durationHours =
    typeof payload.durationHours === "number" &&
    Number.isFinite(payload.durationHours)
      ? Math.round(payload.durationHours)
      : null;

  if (!allowedActions.has(action)) {
    return Response.json(
      { error: "Invalid moderation action." },
      { status: 400 },
    );
  }

  // Capture the recipient before moderation so a successful ban/restore
  // can still send its transactional notification.
  const { data: member, error: memberError } = await supabase
    .from("profiles")
    .select("email,display_name")
    .eq("id", id)
    .maybeSingle();

  if (memberError) {
    return Response.json(
      {
        error:
          memberError.message ||
          "Unable to load the member account.",
      },
      { status: 400 },
    );
  }

  const { error } = await supabase.rpc("admin_moderate_member", {
    p_member_id: id,
    p_action: action,
    p_note: note || null,
    p_duration_hours: durationHours,
  });

  if (error) {
    return Response.json(
      { error: error.message || "Unable to update member." },
      { status: 400 },
    );
  }

  const recipient =
    typeof member?.email === "string" ? member.email.trim() : "";
  const displayName =
    typeof member?.display_name === "string" &&
    member.display_name.trim()
      ? member.display_name.trim()
      : "AfroLove member";
  const copy = emailCopy(action, durationHours);

  if (recipient && copy) {
    const safeName = escapeHtml(displayName);
    const safeHeading = escapeHtml(copy.heading);
    const safeBody = escapeHtml(copy.body);
    const safeNote = escapeHtml(note);

    try {
      await sendAfroLoveEmail({
        to: recipient,
        subject: copy.subject,
        text: [
          `Hi ${displayName},`,
          "",
          copy.body,
          note ? `Reason: ${note}` : "",
          "",
          "If you believe this action was made in error or need assistance, contact support@afroloveapp.com.",
          "",
          "AfroLove Support",
        ]
          .filter(Boolean)
          .join("\n"),
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#171717;line-height:1.6">
            <h1 style="font-size:26px;margin-bottom:20px">${safeHeading}</h1>
            <p>Hi ${safeName},</p>
            <p>${safeBody}</p>
            ${
              note
                ? `<div style="margin:22px 0;padding:14px 16px;border-radius:10px;background:#f5f5f5"><strong>Reason:</strong> ${safeNote}</div>`
                : ""
            }
            <p>If you believe this action was made in error or need assistance, contact <strong>support@afroloveapp.com</strong>.</p>
            <p style="margin-top:28px">AfroLove Support<br>support@afroloveapp.com</p>
          </div>
        `,
      });
    } catch (emailError) {
      // Moderation already succeeded. Email delivery must never roll it back.
      console.error(
        "AfroLove moderation email warning:",
        emailError,
      );
    }
  }

  return Response.json({ success: true });
}
