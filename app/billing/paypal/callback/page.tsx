import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Plan = "premium" | "vip";

function paypalApiBase() {
  return process.env.PAYPAL_ENVIRONMENT?.trim().toLowerCase() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function accessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim() || "";
  const secret = process.env.PAYPAL_CLIENT_SECRET?.trim() || "";

  if (!clientId || !secret) {
    throw new Error("PayPal credentials are missing.");
  }

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const response = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.access_token) {
    throw new Error("Unable to authenticate with PayPal.");
  }

  return String(payload.access_token);
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

  if (!url || !serviceKey) {
    throw new Error("Supabase service credentials are missing.");
  }

  return createAdminClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function expectedPlanId(plan: Plan) {
  return plan === "vip"
    ? process.env.PAYPAL_VIP_PLAN_ID?.trim() || ""
    : process.env.PAYPAL_PREMIUM_PLAN_ID?.trim() || "";
}

function planAmountMinor(plan: Plan) {
  return plan === "vip" ? 750 : 350;
}

export default async function PayPalCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const subscriptionId =
    typeof params.subscription_id === "string" ? params.subscription_id : "";

  if (!subscriptionId) {
    redirect("/premium?paypal=missing");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    const token = await accessToken();

    const response = await fetch(
      `${paypalApiBase()}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

    const subscription = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error("Unable to verify PayPal subscription.");
    }

    if (subscription.status !== "ACTIVE") {
      redirect("/premium?paypal=pending");
    }

    const customId =
      typeof subscription.custom_id === "string" ? subscription.custom_id : "";
    const [customUserId, rawPlan] = customId.split(":");

    if (
      customUserId !== user.id ||
      (rawPlan !== "premium" && rawPlan !== "vip")
    ) {
      throw new Error("PayPal subscription does not match this member.");
    }

    const plan: Plan = rawPlan;
    const planId = expectedPlanId(plan);

    if (!planId || subscription.plan_id !== planId) {
      throw new Error("PayPal plan verification failed.");
    }

    const admin = adminClient();

    const { data: existing } = await admin
      .from("member_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("provider", "paypal")
      .eq("provider_subscription_id", subscription.id)
      .maybeSingle();

    let subscriptionRowId = existing?.id || null;

    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    if (!subscriptionRowId) {
      const { error: expireError } = await admin
        .from("member_subscriptions")
        .update({
          status: "expired",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .in("status", ["pending", "trialing", "active", "past_due"]);

      if (expireError) throw expireError;

      const { data: created, error: insertError } = await admin
        .from("member_subscriptions")
        .insert({
          user_id: user.id,
          plan_slug: plan,
          status: "active",
          provider: "paypal",
          provider_subscription_id: subscription.id,
          provider_plan_id: subscription.plan_id,
          customer_email:
            subscription.subscriber?.email_address || user.email || null,
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
          is_test:
            process.env.PAYPAL_ENVIRONMENT?.trim().toLowerCase() !== "live",
          metadata: subscription,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      subscriptionRowId = created.id;
    } else {
      const { error: updateError } = await admin
        .from("member_subscriptions")
        .update({
          plan_slug: plan,
          status: "active",
          provider_plan_id: subscription.plan_id,
          customer_email:
            subscription.subscriber?.email_address || user.email || null,
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
          is_test:
            process.env.PAYPAL_ENVIRONMENT?.trim().toLowerCase() !== "live",
          metadata: subscription,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscriptionRowId);

      if (updateError) throw updateError;
    }

    const txRef = `paypal-subscription-${subscription.id}`;
    const providerTransactionId = `paypal:${subscription.id}`;

    const { data: existingTx } = await admin
      .from("payment_transactions")
      .select("id")
      .eq("tx_ref", txRef)
      .maybeSingle();

    if (!existingTx) {
      const { error: txError } = await admin
        .from("payment_transactions")
        .insert({
          user_id: user.id,
          subscription_id: subscriptionRowId,
          tx_ref: txRef,
          provider_transaction_id: providerTransactionId,
          plan_slug: plan,
          amount_minor: planAmountMinor(plan),
          currency: "GBP",
          status: "successful",
          split_snapshot: {
            provider: "paypal",
            mode: "main_account_only",
            subaccounts: [],
          },
          provider_payload: subscription,
          paid_at: new Date().toISOString(),
        });

      if (txError) throw txError;
    }
  } catch (error) {
    console.error("PayPal callback failed:", error);
    redirect("/premium?paypal=error");
  }

  redirect("/billing?paypal=success");
}
