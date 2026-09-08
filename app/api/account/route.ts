import {
  deleteAfroLoveAccount,
} from "@/lib/account-deletion";
import { isAdmin } from "@/lib/admin";
import { sendAfroLoveEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function DELETE(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      {
        error: "Authentication required.",
      },
      { status: 401 },
    );
  }

  if (await isAdmin(supabase)) {
    return Response.json(
      {
        error:
          "Staff accounts cannot be deleted from member settings.",
      },
      { status: 403 },
    );
  }

  let payload: {
    confirmation?: unknown;
    reason?: unknown;
  };

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      {
        error: "Invalid account-deletion request.",
      },
      { status: 400 },
    );
  }

  const confirmation =
    typeof payload.confirmation === "string"
      ? payload.confirmation.trim()
      : "";

  const reason =
    typeof payload.reason === "string"
      ? payload.reason.trim().slice(0, 500)
      : "";

  if (confirmation !== "DELETE") {
    return Response.json(
      {
        error:
          'Type DELETE exactly to confirm permanent account deletion.',
      },
      { status: 400 },
    );
  }

  const recipient =
    typeof user.email === "string"
      ? user.email.trim()
      : "";

  let displayName =
    typeof user.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : "AfroLove member";

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    if (
      typeof profile?.display_name === "string" &&
      profile.display_name.trim()
    ) {
      displayName = profile.display_name.trim();
    }
  } catch (profileError) {
    console.warn(
      "AfroLove deletion profile lookup warning:",
      profileError,
    );
  }

  try {
    const summary =
      await deleteAfroLoveAccount({
        userId: user.id,
        actor: {
          kind: "member",
          id: user.id,
        },
        reason,
      });

    if (recipient) {
      const safeName = escapeHtml(displayName);

      try {
        await sendAfroLoveEmail({
          to: recipient,
          subject: "Your AfroLove account has been deleted",
          text: [
            `Hi ${displayName},`,
            "",
            "Your AfroLove account has been permanently deleted as requested.",
            "",
            "If you did not request this deletion or need assistance, contact support@afroloveapp.com.",
            "",
            "AfroLove Support",
            "support@afroloveapp.com",
          ].join("\n"),
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#171717;line-height:1.6">
              <h1 style="font-size:26px;margin-bottom:20px">Account deleted</h1>
              <p>Hi ${safeName},</p>
              <p>Your AfroLove account has been <strong>permanently deleted</strong> as requested.</p>
              <p>If you did not request this deletion or need assistance, contact <strong>support@afroloveapp.com</strong>.</p>
              <p style="margin-top:28px">AfroLove Support<br>support@afroloveapp.com</p>
            </div>
          `,
        });
      } catch (emailError) {
        // Deletion already succeeded. Email failure must never make
        // the deletion appear unsuccessful or attempt to roll it back.
        console.error(
          "AfroLove account-deletion email warning:",
          emailError,
        );
      }
    }

    return Response.json({
      success: true,
      summary,
    });
  } catch (caught) {
    console.error(
      "AfroLove self-deletion failed:",
      caught,
    );

    return Response.json(
      {
        error:
          caught instanceof Error &&
          caught.message.includes(
            "not configured",
          )
            ? "Account deletion is temporarily unavailable."
            : "AfroLove could not complete every deletion step safely. No further action was taken.",
      },
      { status: 500 },
    );
  }
}
