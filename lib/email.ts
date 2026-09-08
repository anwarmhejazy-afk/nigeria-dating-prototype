import nodemailer from "nodemailer";

const host = process.env.AFROLOVE_SMTP_HOST || "smtp.ionos.co.uk";
const port = Number(process.env.AFROLOVE_SMTP_PORT || 587);
const user = process.env.AFROLOVE_SMTP_USER || "support@afroloveapp.com";
const pass = process.env.AFROLOVE_SMTP_PASS || "";
const from =
  process.env.AFROLOVE_EMAIL_FROM ||
  "AfroLove Support <support@afroloveapp.com>";

function getTransporter() {
  if (!pass) {
    throw new Error("AFROLOVE_SMTP_PASS is not configured.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendAfroLoveEmail({
  to,
  subject,
  text,
  html,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}) {
  const transporter = getTransporter();

  return transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
    replyTo: replyTo || "support@afroloveapp.com",
  });
}
