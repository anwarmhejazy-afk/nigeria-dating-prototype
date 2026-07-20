import { verifyFlutterwaveTransaction } from "@/lib/flutterwave";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });

  const url = new URL(request.url);
  const transactionId = url.searchParams.get("transaction_id") || "";
  const txRef = url.searchParams.get("tx_ref") || "";
  if (!transactionId || !txRef) {
    return Response.json({ error: "Payment verification details are missing." }, { status: 400 });
  }

  const { data: localTransaction } = await supabase
    .from("payment_transactions")
    .select("tx_ref,amount_minor,currency,status")
    .eq("user_id", user.id)
    .eq("tx_ref", txRef)
    .maybeSingle();

  if (!localTransaction) return Response.json({ error: "Payment record not found." }, { status: 404 });
  if (localTransaction.status === "successful") return Response.json({ success: true, alreadyConfirmed: true });

  try {
    const response = await verifyFlutterwaveTransaction(transactionId);
    const data = response.data;
    const verifiedStatus = text(data.status);
    const verifiedRef = text(data.tx_ref || data.reference);
    const verifiedCurrency = text(data.currency).toUpperCase();
    const amountMinor = Math.round(Number(data.amount || data.charged_amount || 0) * 100);

    if (!["successful", "succeeded"].includes(verifiedStatus) || verifiedRef !== txRef) {
      return Response.json({ error: "Flutterwave did not confirm this payment." }, { status: 400 });
    }
    if (amountMinor !== localTransaction.amount_minor || verifiedCurrency !== localTransaction.currency.toUpperCase()) {
      return Response.json({ error: "Verified amount or currency did not match the checkout." }, { status: 400 });
    }

    const { data: plan, error } = await supabase.rpc("confirm_flutterwave_payment", {
      p_tx_ref: txRef,
      p_provider_transaction_id: text(data.id || transactionId),
      p_amount_minor: amountMinor,
      p_currency: verifiedCurrency,
      p_provider_subscription_id: text((data.subscription as Record<string, unknown> | undefined)?.id),
      p_provider_plan_id: text((data.plan as Record<string, unknown> | undefined)?.id),
      p_payload: data,
      p_sync_secret: process.env.FLW_SYNC_SECRET || "",
    });

    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ success: true, plan });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Unable to verify payment.",
    }, { status: 502 });
  }
}
