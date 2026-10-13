import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type ResendEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    bounce?: {
      message?: string;
    };
    error?: string | {
      message?: string;
    };
    [key: string]: unknown;
  };
};

const progressRank: Record<string, number> = {
  submitted: 0,
  sent: 1,
  delayed: 1,
  delivered: 2,
  opened: 3,
  clicked: 4,
};

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  if (!apiKey || !webhookSecret) {
    console.error("Resend webhook environment variables are missing.");
    return Response.json(
      { error: "Webhook is not configured." },
      { status: 503 },
    );
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json(
      { error: "Missing webhook signature." },
      { status: 400 },
    );
  }

  const payload = await request.text();
  const resend = new Resend(apiKey);

  let event: ResendEvent;

  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: svixId,
        timestamp: svixTimestamp,
        signature: svixSignature,
      },
      webhookSecret,
    }) as unknown as ResendEvent;
  } catch (error) {
    console.error(
      "Invalid Resend webhook signature",
      error instanceof Error ? error.message : error,
    );

    return Response.json(
      { error: "Invalid webhook signature." },
      { status: 400 },
    );
  }

  const emailId = event.data?.email_id;

  if (!emailId) {
    return Response.json({
      received: true,
      ignored: true,
    });
  }

  const service = createAdminClient() as any;

  const { data: reminder, error: lookupError } = await service
    .from("profile_reminder_attempts")
    .select("id, delivery_status")
    .eq("provider_message_id", emailId)
    .maybeSingle();

  if (lookupError) {
    console.error(
      "Unable to locate reminder for Resend event",
      lookupError.code,
    );

    return Response.json(
      { error: "Unable to process webhook." },
      { status: 500 },
    );
  }

  if (!reminder) {
    return Response.json({
      received: true,
      matched: false,
    });
  }

  const eventTime =
    event.created_at || new Date().toISOString();

  const update: Record<string, string | null> = {
    last_delivery_event_at: eventTime,
  };

  let nextStatus: string | null = null;
  let terminalStatus = false;

  switch (event.type) {
    case "email.sent":
      nextStatus = "sent";
      update.sent_at = eventTime;
      break;

    case "email.delivered":
      nextStatus = "delivered";
      update.delivered_at = eventTime;
      break;

    case "email.delivery_delayed":
      nextStatus = "delayed";
      update.delayed_at = eventTime;
      break;

    case "email.opened":
      nextStatus = "opened";
      update.opened_at = eventTime;
      break;

    case "email.clicked":
      nextStatus = "clicked";
      update.clicked_at = eventTime;
      break;

    case "email.bounced":
      nextStatus = "bounced";
      terminalStatus = true;
      update.bounced_at = eventTime;
      update.last_delivery_error =
        event.data?.bounce?.message || "Email bounced.";
      break;

    case "email.complained":
      nextStatus = "complained";
      terminalStatus = true;
      update.complained_at = eventTime;
      update.last_delivery_error =
        "Recipient reported the email as spam.";
      break;

    case "email.failed":
    case "email.suppressed": {
      nextStatus = "failed";
      terminalStatus = true;
      update.failed_at = eventTime;

      const errorValue = event.data?.error;

      update.last_delivery_error =
        typeof errorValue === "string"
          ? errorValue
          : errorValue &&
              typeof errorValue === "object" &&
              typeof errorValue.message === "string"
            ? errorValue.message
            : event.type === "email.suppressed"
              ? "Email was suppressed by the provider."
              : "Email delivery failed.";
      break;
    }

    default:
      return Response.json({
        received: true,
        ignored: true,
        type: event.type,
      });
  }

  const currentStatus =
    typeof reminder.delivery_status === "string"
      ? reminder.delivery_status
      : "submitted";

  if (nextStatus) {
    const currentRank = progressRank[currentStatus] ?? 0;
    const nextRank = progressRank[nextStatus] ?? 0;

    if (
      terminalStatus ||
      !["bounced", "failed", "complained"].includes(currentStatus) &&
        nextRank >= currentRank
    ) {
      update.delivery_status = nextStatus;
    }
  }

  if (
    !["bounced", "failed", "complained"].includes(nextStatus || "")
  ) {
    update.last_delivery_error = null;
  }

  const { error: updateError } = await service
    .from("profile_reminder_attempts")
    .update(update)
    .eq("id", reminder.id);

  if (updateError) {
    console.error(
      "Unable to update reminder delivery status",
      updateError.code,
    );

    return Response.json(
      { error: "Unable to save webhook event." },
      { status: 500 },
    );
  }

  return Response.json({
    received: true,
    matched: true,
    status: update.delivery_status || currentStatus,
  });
}
