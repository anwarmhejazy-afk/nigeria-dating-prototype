export function profileReminderEmail(displayName: string, onboardingCompleted: boolean) {
  const name = displayName.trim() || "AfroLove member";
  const link = onboardingCompleted
    ? "https://www.afroloveapp.com/verification"
    : "https://www.afroloveapp.com/onboarding";
  const guidance = onboardingCompleted
    ? "Your profile is ready for the next step. Please sign in and complete the verification requested on your account."
    : "Your AfroLove profile is still incomplete. Please sign in, complete the required profile details, upload a clear recent photo, and submit your profile. You can then complete verification.";
  const paragraphs = [
    `Hi ${name},`,
    guidance,
    "Please use your accurate date of birth and genuine profile information. Your profile remains subject to AfroLove's verification requirements before member access is available.",
    "If you started more than one registration, please contact support so we can help you choose the account you want to keep.",
    "This is a friendly reminder. It is not an account warning.",
  ];
  const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  return {
    subject: onboardingCompleted ? "Complete your AfroLove verification" : "Complete your AfroLove profile",
    text: [...paragraphs, link, "Need help? Reply to this email or contact support@afroloveapp.com.", "AfroLove Support"].join("\n\n"),
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#171717;line-height:1.6"><h1 style="font-size:26px">Your next step on AfroLove</h1>${paragraphs.map((p) => `<p>${escape(p)}</p>`).join("")}<p><a href="${link}" style="display:inline-block;background:#F2C94C;color:#171717;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${onboardingCompleted ? "Complete verification" : "Complete my profile"}</a></p><p>Need help? Reply to this email or contact support@afroloveapp.com.</p><p>AfroLove Support</p></div>`,
  };
}
