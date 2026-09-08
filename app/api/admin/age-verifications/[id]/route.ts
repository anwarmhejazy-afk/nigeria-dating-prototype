import { isAdmin } from "@/lib/admin";
import { sendAfroLoveEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  decision?: unknown;
  note?: unknown;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await context.params;

  const supabase = await createClient();
  const db = supabase as any;

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

  let payload: Payload;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const decision =
    typeof payload.decision === "string"
      ? payload.decision
      : "";

  const note =
    typeof payload.note === "string"
      ? payload.note.trim()
      : "";

  const allowed = new Set([
    "approve_photo",
    "require_id",
    "approve_id",
    "reject",
    "underage",
  ]);

  if (!allowed.has(decision)) {
    return Response.json(
      { error: "Invalid review action." },
      { status: 400 },
    );
  }

  const { data: verification } = await db
    .from("verification_requests")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await db.rpc(
    "admin_review_layered_verification",
    {
      p_request_id: id,
      p_decision: decision,
      p_note: note || null,
    },
  );

  if (error) {
    return Response.json(
      {
        error:
          error.message ||
          "Unable to review verification.",
      },
      { status: 400 },
    );
  }

  if (verification?.user_id) {
    if (decision === "underage") {
      const { error: banError } = await db.rpc(
        "admin_moderate_member",
        {
          p_member_id: verification.user_id,
          p_action: "ban",
          p_note:
            note ||
            "Under 18 — account banned following age verification review.",
          p_duration_hours: null,
        },
      );

      if (banError) {
        console.error(
          "AfroLove automatic underage ban failed:",
          banError,
        );

        return Response.json(
          {
            error:
              banError.message ||
              "Verification was reviewed, but the underage account could not be banned automatically.",
          },
          { status: 400 },
        );
      }
    }

    const approved = [
      "approve_photo",
      "approve_id",
    ].includes(decision);

    await sendPushToUser(
      supabase,
      verification.user_id,
      {
        type: "verification",
        title: approved
          ? "AfroLove verification approved"
          : decision === "require_id"
            ? "Additional ID required"
            : decision === "underage"
              ? "AfroLove account age restriction"
              : "Verification updated",
        body: approved
          ? "Your verification has been approved."
          : decision === "underage"
            ? "Your account has been banned because AfroLove is only available to adults aged 18 and over."
            : note ||
              (decision === "require_id"
                ? "Government ID is required to complete your review."
                : "Your verification request was reviewed."),
        url: "/verification",
        tag: `verification-review-${id}`,
        metadata: {
          requestId: id,
          decision,
        },
      },
    );

    const { data: profile } = await db
      .from("profiles")
      .select("email,display_name")
      .eq("id", verification.user_id)
      .maybeSingle();

    const memberEmail =
      typeof profile?.email === "string"
        ? profile.email.trim()
        : "";

    const memberName =
      profile?.display_name?.trim() || "there";

    if (memberEmail) {
      let subject = "AfroLove verification updated";
      let heading = "Verification update";
      let message =
        note ||
        "Your AfroLove verification request has been reviewed.";

      if (approved) {
        subject = "Your AfroLove verification is approved";
        heading = "You’re verified";
        message =
          "Your AfroLove verification has been approved successfully.";
      } else if (decision === "require_id") {
        subject =
          "Additional ID is required for AfroLove verification";
        heading = "Additional ID required";
        message =
          note ||
          "We need a valid government-issued ID to complete your verification.";
      } else if (decision === "reject") {
        subject =
          "Your AfroLove verification needs attention";
        heading = "Verification was not approved";
        message =
          note ||
          "Your verification could not be approved. Please review the verification page and try again.";
      } else if (decision === "underage") {
        subject = "AfroLove age verification update";
        heading = "Account unavailable due to age requirement";
        message =
          "AfroLove is only available to adults aged 18 and over. Your account has therefore been banned following the age verification review.";
      }

      try {
        await sendAfroLoveEmail({
          to: memberEmail,
          subject,
          text: `Hi ${memberName},

${message}

If you believe this decision was made in error, reply to this email or contact support@afroloveapp.com.

AfroLove Support
support@afroloveapp.com`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;line-height:1.6;color:#222">
              <h1>${escapeHtml(heading)}</h1>
              <p>Hi ${escapeHtml(String(memberName))},</p>
              <p>${escapeHtml(message)}</p>
              <p>If you believe this decision was made in error, reply to this email or contact <strong>support@afroloveapp.com</strong>.</p>
              <p>AfroLove Support<br>support@afroloveapp.com</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error(
          "AfroLove verification email failed:",
          emailError,
        );
      }
    }
  }

  return Response.json({ success: true });
}
