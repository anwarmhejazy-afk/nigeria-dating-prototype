import {
  paystackIsTestMode,
  verifyPaystackTransaction,
} from "@/lib/paystack";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function text(value: unknown) {
  return typeof value === "string" ||
    typeof value === "number"
    ? String(value)
    : "";
}

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const reference =
    url.searchParams.get("reference") || "";

  if (!reference) {
    return Response.json(
      {
        error:
          "Payment verification details are missing.",
      },
      { status: 400 },
    );
  }

  const { data: localTransaction } = await supabase
    .from("payment_transactions")
    .select("tx_ref,amount_minor,currency,status")
    .eq("user_id", user.id)
    .eq("tx_ref", reference)
    .maybeSingle();

  if (!localTransaction) {
    return Response.json(
      { error: "Payment record not found." },
      { status: 404 },
    );
  }

  if (localTransaction.status === "successful") {
    return Response.json({
      success: true,
      alreadyConfirmed: true,
    });
  }

  try {
    const response =
      await verifyPaystackTransaction(reference);
    const data = response.data;
    const verifiedStatus = text(data.status);
    const verifiedRef = text(data.reference);
    const verifiedCurrency = text(
      data.currency,
    ).toUpperCase();
    const amountMinor = Math.round(
      Number(data.amount || 0),
    );

    if (
      verifiedStatus !== "success" ||
      verifiedRef !== reference
    ) {
      return Response.json(
        {
          error:
            "Paystack did not confirm this payment.",
        },
        { status: 400 },
      );
    }

    if (
      amountMinor !==
        localTransaction.amount_minor ||
      verifiedCurrency !==
        localTransaction.currency.toUpperCase()
    ) {
      return Response.json(
        {
          error:
            "Verified amount or currency did not match the checkout.",
        },
        { status: 400 },
      );
    }

    const providerTransactionId = text(data.id);

    if (!providerTransactionId) {
      return Response.json(
        { error: "Paystack transaction ID is missing." },
        { status: 400 },
      );
    }

    const { data: plan, error } = await supabase.rpc(
      "confirm_paystack_payment",
      {
        p_tx_ref: reference,
        p_provider_transaction_id: `paystack:${providerTransactionId}`,
        p_amount_minor: amountMinor,
        p_currency: verifiedCurrency,
        p_payload: data,
        p_is_test: paystackIsTestMode(),
        p_sync_secret:
          process.env.FLW_SYNC_SECRET || "",
      },
    );

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 400 },
      );
    }

    return Response.json({ success: true, plan });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to verify payment.",
      },
      { status: 502 },
    );
  }
}
