import { sendAfroLoveEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name,onboarding_completed,welcome_email_sent_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed) {
    return Response.json(
      { error: "Complete your profile first." },
      { status: 400 },
    );
  }

  if (profile.welcome_email_sent_at) {
    return Response.json({
      success: true,
      alreadySent: true,
    });
  }

  const claimTime = new Date().toISOString();

  const { data: claimedProfile, error: claimError } =
    await supabase
      .from("profiles")
      .update({
        welcome_email_sent_at: claimTime,
      })
      .eq("id", user.id)
      .is("welcome_email_sent_at", null)
      .select("id")
      .maybeSingle();

  if (claimError) {
    console.error(
      "AfroLove welcome email claim failed:",
      claimError,
    );

    return Response.json(
      { error: "Unable to prepare welcome email." },
      { status: 500 },
    );
  }

  if (!claimedProfile) {
    return Response.json({
      success: true,
      alreadySent: true,
    });
  }

  const name =
    profile.display_name?.trim() ||
    user.user_metadata?.full_name ||
    "there";

  const safeName = escapeHtml(String(name));

  try {
    await sendAfroLoveEmail({
      to: user.email,
      subject: "Welcome to AfroLove ❤️",
      text: `Hi ${name},

Welcome to AfroLove!

Your free AfroLove account is now set up and your profile has been created successfully.

You can now continue with verification and start exploring AfroLove.

Visit AfroLove:
https://www.afroloveapp.com

If you need help, reply to this email or contact support@afroloveapp.com.

AfroLove Support
support@afroloveapp.com`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;line-height:1.6;color:#222">
          <h1 style="margin-bottom:8px;">Welcome to AfroLove ❤️</h1>
          <p>Hi ${safeName},</p>
          <p>Your <strong>free AfroLove account</strong> is now set up and your profile has been created successfully.</p>
          <p>You can now continue with verification and start exploring AfroLove.</p>
          <p>
            <a href="https://www.afroloveapp.com"
               style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px;">
              Open AfroLove
            </a>
          </p>
          <p>If you need help, simply reply to this email or contact <strong>support@afroloveapp.com</strong>.</p>
          <p>AfroLove Support<br>support@afroloveapp.com</p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error(
      "AfroLove welcome email failed:",
      emailError,
    );

    await supabase
      .from("profiles")
      .update({
        welcome_email_sent_at: null,
      })
      .eq("id", user.id)
      .eq("welcome_email_sent_at", claimTime);

    return Response.json(
      { error: "Unable to send welcome email." },
      { status: 500 },
    );
  }

  return Response.json({ success: true });
}
