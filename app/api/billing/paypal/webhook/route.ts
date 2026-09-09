import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Plan = "premium" | "vip";

type PayPalWebhookEvent = {
  id?: string;
  event_type?: string;
  resource?: Record<string, any>;
};

function paypalApiBase() {
  return process.env.PAYPAL_ENVIRONMENT?.trim().toLowerCase() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

  if (!url || !serviceKey) {
    throw new Error("Supabase service credentials are missing.");
  }

  return createAdminClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
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

async function paypalAccessToken() {
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
    throw new Error(
      payload?.error_description ||
        payload?.error ||
        "Unable to authenticate with PayPal.",
    );
  }

  return String(payload.access_token);
}

async function verifyWebhook(request: Request, event: PayPalWebhookEvent) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim() || "";

  if (!webhookId) {
    throw new Error("PAYPAL_WEBHOOK_ID is not configured.");
  }

  const transmissionId = request.headers.get("paypal-transmission-id") || "";
  const transmissionTime = request.headers.get("paypal-transmission-time") || "";
  const certUrl = request.headers.get("paypal-cert-url") || "";
  const authAlgo = request.headers.get("paypal-auth-algo") || "";
  const transmissionSig = request.headers.get("paypal-transmission-sig") || "";

  if (
    !transmissionId ||
    !transmissionTime ||
    !certUrl ||
    !authAlgo ||
    !transmissionSig
  ) {
    return false;
  }

  const token = await paypalAccessToken();

  const response = await fetch(
    `${paypalApiBase()}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: event,
      }),
      cache: "no-store",
    },
  );

  const payload = await response.json().catch(() => ({}));

  return (
    response.ok &&
    String(payload?.verification_status || "").toUpperCase() === "SUCCESS"
  );
}

async function getSubscription(subscriptionId: string) {
  const token = await paypalAccessToken();

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

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload?.message || "Unable to retrieve PayPal subscription.",
    );
  }

  return payload;
}

function parseSubscriptionOwner(subscription: any) {
  const customId =
    typeof subscription?.custom_id === "string" ? subscription.custom_id : "";
  const [userId, rawPlan] = customId.split(":");

  if (!userId || (rawPlan !== "premium" && rawPlan !== "vip")) {
    throw new Error("Invalid AfroLove PayPal subscription custom_id.");
  }

  const plan: Plan = rawPlan;
  const planId = expectedPlanId(plan);

  if (!planId || subscription?.plan_id !== planId) {
    throw new Error("PayPal subscription plan verification failed.");
  }

  return { userId, plan };
}

function mappedSubscriptionStatus(paypalStatus: string) {
  switch (paypalStatus.toUpperCase()) {
    case "ACTIVE":
      return "active";
    case "SUSPENDED":
      return "past_due";
    case "CANCELLED":
      return "cancelled";
    case "EXPIRED":
      return "expired";
    case "APPROVAL_PENDING":
    case "APPROVED":
      return "pending";
    default:
      return null;
  }
}

function extractSubscriptionId(event: PayPalWebhookEvent) {
  const resource = event.resource || {};
  const eventType = event.event_type || "";

  if (eventType.startsWith("BILLING.SUBSCRIPTION.")) {
    return typeof resource.id === "string" ? resource.id : "";
  }

  if (eventType.startsWith("PAYMENT.SALE.")) {
    return typeof resource.billing_agreement_id === "string"
      ? resource.billing_agreement_id
      : "";
  }

  return "";
}

async function syncSubscription(
  subscriptionId: string,
  forcedStatus?: string | null,
) {
  const subscription = await getSubscription(subscriptionId);
  const { userId, plan } = parseSubscriptionOwner(subscription);
  const admin = adminClient();

  const status =
    forcedStatus ||
    mappedSubscriptionStatus(String(subscription?.status || "")) ||
    "active";

  const periodStart =
    subscription?.billing_info?.last_payment?.time ||
    subscription?.start_time ||
    new Date().toISOString();

  const periodEnd =
    subscription?.billing_info?.next_billing_time ||
    subscription?.billing_info?.final_payment_time ||
    null;

  const { data: existing, error: lookupError } = await admin
    .from("member_subscriptions")
    .select("id")
    .eq("provider", "paypal")
    .eq("provider_subscription_id", subscriptionId)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (existing?.id) {
    const { error } = await admin
      .from("member_subscriptions")
      .update({
        plan_slug: plan,
        status,
        provider_plan_id: subscription.plan_id,
        customer_email: subscription?.subscriber?.email_address || null,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: ["cancelled", "expired"].includes(status),
        is_test:
          process.env.PAYPAL_ENVIRONMENT?.trim().toLowerCase() !== "live",
        metadata: subscription,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) throw error;

    return { subscriptionRowId: existing.id, userId, plan, subscription };
  }

  if (["active", "past_due", "pending"].includes(status)) {
    const { error: expireError } = await admin
      .from("member_subscriptions")
      .update({
        status: "expired",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .in("status", ["pending", "trialing", "active", "past_due"]);

    if (expireError) throw expireError;
  }

  const { data: created, error: insertError } = await admin
    .from("member_subscriptions")
    .insert({
      user_id: userId,
      plan_slug: plan,
      status,
      provider: "paypal",
      provider_subscription_id: subscriptionId,
      provider_plan_id: subscription.plan_id,
      customer_email: subscription?.subscriber?.email_address || null,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: ["cancelled", "expired"].includes(status),
      is_test:
        process.env.PAYPAL_ENVIRONMENT?.trim().toLowerCase() !== "live",
      metadata: subscription,
    })
    .select("id")
    .single();

  if (insertError) throw insertError;

  return {
    subscriptionRowId: created.id,
    userId,
    plan,
    subscription,
  };
}

async function recordCompletedSale(
  event: PayPalWebhookEvent,
  subscriptionId: string,
) {
  const resource = event.resource || {};
  const saleId = typeof resource.id === "string" ? resource.id : "";

  if (!saleId) return;

  const synced = await syncSubscription(subscriptionId, "active");
  const admin = adminClient();

  const txRef = `paypal-sale-${saleId}`;
  const providerTransactionId = `paypal:${saleId}`;

  const { data: existing, error: lookupError } = await admin
    .from("payment_transactions")
    .select("id")
    .eq("tx_ref", txRef)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existing?.id) return;

  const amountValue = Number(resource?.amount?.total);
  const amountMinor = Number.isFinite(amountValue)
    ? Math.round(amountValue * 100)
    : planAmountMinor(synced.plan);

  const currency =
    typeof resource?.amount?.currency === "string"
      ? resource.amount.currency
      : "GBP";

  const { error: txError } = await admin.from("payment_transactions").insert({
    user_id: synced.userId,
    subscription_id: synced.subscriptionRowId,
    tx_ref: txRef,
    provider_transaction_id: providerTransactionId,
    plan_slug: synced.plan,
    amount_minor: amountMinor,
    currency,
    status: "successful",
    split_snapshot: {
      provider: "paypal",
      mode: "main_account_only",
      subaccounts: [],
    },
    provider_payload: resource,
    paid_at:
      typeof resource?.create_time === "string"
        ? resource.create_time
        : new Date().toISOString(),
  });

  if (txError) throw txError;
}

async function markSaleOutcome(
  event: PayPalWebhookEvent,
  outcome: "refunded" | "failed",
) {
  const resource = event.resource || {};
  const parentSaleId =
    typeof resource.parent_payment === "string"
      ? resource.parent_payment
      : typeof resource.sale_id === "string"
        ? resource.sale_id
        : "";

  if (!parentSaleId) return;

  const admin = adminClient();

  const { error } = await admin
    .from("payment_transactions")
    .update({
      status: outcome,
      provider_payload: resource,
      updated_at: new Date().toISOString(),
    })
    .eq("provider_transaction_id", `paypal:${parentSaleId}`);

  if (error) throw error;
}

export async function POST(request: Request) {
  let event: PayPalWebhookEvent;

  try {
    const rawBody = await request.text();
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  try {
    const verified = await verifyWebhook(request, event);

    if (!verified) {
      return Response.json(
        { error: "Invalid PayPal webhook signature." },
        { status: 401 },
      );
    }

    const eventType = event.event_type || "";
    const subscriptionId = extractSubscriptionId(event);

    switch (eventType) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
      case "BILLING.SUBSCRIPTION.UPDATED":
        if (subscriptionId) await syncSubscription(subscriptionId);
        break;

      case "BILLING.SUBSCRIPTION.CANCELLED":
        if (subscriptionId) await syncSubscription(subscriptionId, "cancelled");
        break;

      case "BILLING.SUBSCRIPTION.EXPIRED":
        if (subscriptionId) await syncSubscription(subscriptionId, "expired");
        break;

      case "BILLING.SUBSCRIPTION.SUSPENDED":
      case "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
        if (subscriptionId) await syncSubscription(subscriptionId, "past_due");
        break;

      case "PAYMENT.SALE.COMPLETED":
        if (subscriptionId) await recordCompletedSale(event, subscriptionId);
        break;

      case "PAYMENT.SALE.REFUNDED":
        await markSaleOutcome(event, "refunded");
        break;

      case "PAYMENT.SALE.REVERSED":
        await markSaleOutcome(event, "failed");
        break;

      default:
        break;
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("PayPal webhook processing failed:", {
      eventId: event.id,
      eventType: event.event_type,
      error,
    });

    return Response.json(
      { error: "Webhook could not be processed." },
      { status: 500 },
    );
  }
}
