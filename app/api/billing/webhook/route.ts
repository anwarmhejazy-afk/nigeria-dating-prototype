import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  isValidPaystackWebhook,
  paystackIsTestMode,
  verifyPaystackTransaction,
} from "@/lib/paystack";

export const dynamic = "force-dynamic";

function text(value: unknown) {
  return typeof value === "string" ||
    typeof value === "number"
    ? String(value)
    : "";
}

function webhookClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get(
    "x-paystack-signature",
  );

  if (!isValidPaystackWebhook(rawBody, signature)) {
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

  const event = text(payload.event);
  const eventData =
    payload.data &&
    typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : {};

  if (event !== "charge.success") {
    return Response.json({ received: true });
  }

  const reference = text(eventData.reference);

  if (!reference) {
    return Response.json({ received: true });
  }

  try {
    const verified =
      await verifyPaystackTransaction(reference);
    const data = verified.data;

    if (text(data.status) !== "success") {
      return Response.json({ received: true });
    }

    const currency = text(data.currency).toUpperCase();
    const amountMinor = Math.round(
      Number(data.amount || 0),
    );
    const providerTransactionId = text(data.id);

    if (!providerTransactionId) {
      throw new Error("Paystack transaction ID is missing.");
    }

    const supabase = webhookClient();

    const { error } = await supabase.rpc(
      "confirm_paystack_payment",
      {
        p_tx_ref: reference,
        p_provider_transaction_id: `paystack:${providerTransactionId}`,
        p_amount_minor: amountMinor,
        p_currency: currency,
        p_payload: data,
        p_is_test: paystackIsTestMode(),
        p_sync_secret:
          process.env.FLW_SYNC_SECRET || "",
      },
    );

    if (error) throw error;

    return Response.json({ received: true });
  } catch (error) {
    console.error(
      "Paystack webhook verification failed",
      error,
    );

    return Response.json(
      { error: "Webhook could not be processed." },
      { status: 500 },
    );
  }
}
