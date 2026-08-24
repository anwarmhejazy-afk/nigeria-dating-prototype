import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function paypalApiBase() {
  return process.env.PAYPAL_ENVIRONMENT?.trim().toLowerCase() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
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
      payload.error_description ||
        payload.error ||
        "Unable to authenticate with PayPal.",
    );
  }

  return String(payload.access_token);
}

async function getPayPalSubscription(subscriptionId: string) {
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
      payload?.message || "Unable to verify PayPal subscription.",
    );
  }

  return { token, payload };
}

async function cancelPayPalSubscription(subscriptionId: string) {
  const { token, payload } = await getPayPalSubscription(subscriptionId);

  if (payload.status === "CANCELLED" || payload.status === "EXPIRED") {
    return payload.status;
  }

  const response = await fetch(
    `${paypalApiBase()}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: "AfroLove member requested cancellation.",
      }),
      cache: "no-store",
    },
  );

  if (response.status !== 204) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(
      errorPayload?.details?.[0]?.description ||
        errorPayload?.message ||
        "Unable to cancel PayPal subscription.",
    );
  }

  return "CANCELLED";
}

export async function POST() {
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

  const { data: membership, error: membershipError } = await supabase
    .from("member_subscriptions")
    .select(
      "id,provider,provider_subscription_id,status,cancel_at_period_end,current_period_end",
    )
    .eq("user_id", user.id)
    .in("status", ["trialing", "active", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return Response.json(
      { error: membershipError.message },
      { status: 400 },
    );
  }

  if (!membership) {
    return Response.json(
      { error: "No active membership was found." },
      { status: 404 },
    );
  }

  try {
    let paypalStatus: string | null = null;

    if (
      membership.provider === "paypal" &&
      membership.provider_subscription_id
    ) {
      paypalStatus = await cancelPayPalSubscription(
        membership.provider_subscription_id,
      );
    }

    if (!membership.cancel_at_period_end) {
      const { error } = await supabase.rpc(
        "cancel_membership_at_period_end",
      );

      if (error) {
        throw error;
      }
    }

    return Response.json({
      success: true,
      provider: membership.provider,
      paypalStatus,
      currentPeriodEnd: membership.current_period_end,
      message:
        "Your membership will remain active until the end of the current period and will not renew.",
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to cancel membership.",
      },
      { status: 502 },
    );
  }
}
