import { Resend } from "resend";

type ReminderEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  idempotencyKey: string;
};

export async function sendProfileReminderWithResend({
  to,
  subject,
  text,
  html,
  replyTo,
  idempotencyKey,
}: ReminderEmail) {
  const apiKey = process.env.RESEND_API_KEY;

  const from =
    process.env.RESEND_FROM_EMAIL ||
    "AfroLove Support <support@afroloveapp.com>";

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send(
    {
      from,
      to,
      subject,
      text,
      html,
      replyTo: replyTo || "support@afroloveapp.com",
    },
    {
      idempotencyKey,
    },
  );

  if (error) {
    throw new Error(error.message || "Resend rejected the email.");
  }

  if (!data?.id) {
    throw new Error("Resend did not return an email ID.");
  }

  return { id: data.id };
}
