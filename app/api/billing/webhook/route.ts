import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { isValidFlutterwaveWebhook, verifyFlutterwaveTransaction } from "@/lib/flutterwave";

export const dynamic = "force-dynamic";

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function webhookClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const flutterwaveSignature = request.headers.get(
    "flutterwave-signature",
  );
  const verificationHash = request.headers.get(
    "verif-hash",
  );

  if (
    !isValidFlutterwaveWebhook(
      rawBody,
      flutterwaveSignature,
      verificationHash,
    )
  ) {
    return Response.json(
      { error: "Invalid webhook signature." },
      { status: 401 },
    );
  }

  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(rawBody) as Record<
      string,
      unknown
    >;
  } catch {
    return Response.json(
      { error: "Invalid webhook payload." },
      { status: 400 },
    );
  }
  const event = text(payload.type || payload.event);
  const eventData = payload.data && typeof payload.data === "object" ? payload.data as Record<string, unknown> : {};

  if (event === "subscription.cancelled") {
    return Response.json({ received: true });
  }

  if (event !== "charge.completed") return Response.json({ received: true });
  const transactionId = text(eventData.id);
  if (!transactionId) return Response.json({ received: true });

  try {
    const verified = await verifyFlutterwaveTransaction(transactionId);
    const data = verified.data;
    const status = text(data.status);
    if (!["successful", "succeeded"].includes(status)) return Response.json({ received: true });

    const txRef = text(data.tx_ref || data.reference);
    const currency = text(data.currency).toUpperCase();
    const amountMinor = Math.round(Number(data.amount || data.charged_amount || 0) * 100);
    const supabase = webhookClient();
    const { error } = await supabase.rpc("confirm_flutterwave_payment", {
      p_tx_ref: txRef,
      p_provider_transaction_id: text(data.id || transactionId),
      p_amount_minor: amountMinor,
      p_currency: currency,
      p_provider_subscription_id: text((data.subscription as Record<string, unknown> | undefined)?.id),
      p_provider_plan_id: text((data.plan as Record<string, unknown> | undefined)?.id),
      p_payload: data,
      p_sync_secret: process.env.FLW_SYNC_SECRET || "",
    });
    if (error) throw error;
    return Response.json({ received: true });
  } catch (error) {
    console.error("Flutterwave webhook verification failed", error);
    return Response.json({ error: "Webhook could not be processed." }, { status: 500 });
  }
}
