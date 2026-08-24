import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Plan = "premium" | "vip";

function paypalConfigured() {
  const enabled =
    process.env.PAYPAL_CHECKOUT_ENABLED?.trim().toLowerCase() === "true";
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const secret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  const environment =
    process.env.PAYPAL_ENVIRONMENT?.trim().toLowerCase() || "sandbox";

  if (!enabled || !clientId || !secret) return false;

  // Safety gate: never allow sandbox PayPal credentials in Production.
  if (process.env.VERCEL_ENV === "production" && environment !== "live") {
    return false;
  }

  return environment === "sandbox" || environment === "live";
}

function paypalApiBase() {
  return process.env.PAYPAL_ENVIRONMENT?.trim().toLowerCase() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function planId(plan: Plan) {
  return plan === "vip"
    ? process.env.PAYPAL_VIP_PLAN_ID?.trim() || ""
    : process.env.PAYPAL_PREMIUM_PLAN_ID?.trim() || "";
}

async function paypalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim() || "";
  const secret = process.env.PAYPAL_CLIENT_SECRET?.trim() || "";
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

export async function POST(request: Request) {
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

  const payload = await request.json().catch(() => ({}));
  const plan: Plan | null =
    payload?.plan === "vip"
      ? "vip"
      : payload?.plan === "premium"
        ? "premium"
        : null;

  if (!plan) {
    return Response.json(
      { error: "Choose Premium or VIP." },
      { status: 400 },
    );
  }

  if (!paypalConfigured()) {
    return Response.json(
      { error: "PayPal checkout is temporarily unavailable." },
      { status: 503 },
    );
  }

  const selectedPlanId = planId(plan);

  if (!selectedPlanId) {
    return Response.json(
      { error: `PayPal ${plan} plan is not configured.` },
      { status: 503 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,email")
    .eq("id", user.id)
    .maybeSingle();

  const requestOrigin = new URL(request.url).origin;
  const siteUrl = (
    process.env.VERCEL_ENV === "preview"
      ? requestOrigin
      : process.env.NEXT_PUBLIC_SITE_URL || requestOrigin
  ).replace(/\/$/, "");

  try {
    const accessToken = await paypalAccessToken();

    const response = await fetch(
      `${paypalApiBase()}/v1/billing/subscriptions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": `afrolove-${plan}-${user.id.slice(0, 8)}-${Date.now()}`,
        },
        body: JSON.stringify({
          plan_id: selectedPlanId,
          custom_id: `${user.id}:${plan}`,
          subscriber: {
            name: {
              given_name:
                profile?.display_name?.trim().split(/\s+/)[0] ||
                "AfroLove",
              surname:
                profile?.display_name
                  ?.trim()
                  .split(/\s+/)
                  .slice(1)
                  .join(" ") || "Member",
            },
            email_address: profile?.email || user.email || undefined,
          },
          application_context: {
            brand_name: "AfroLove",
            locale: "en-GB",
            shipping_preference: "NO_SHIPPING",
            user_action: "SUBSCRIBE_NOW",
            payment_method: {
              payer_selected: "PAYPAL",
              payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
            },
            return_url: `${siteUrl}/billing/paypal/callback?plan=${plan}`,
            cancel_url: `${siteUrl}/premium?paypal=cancelled`,
          },
        }),
        cache: "no-store",
      },
    );

    const subscription = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        subscription?.details?.[0]?.description ||
          subscription?.message ||
          "Unable to create PayPal subscription.",
      );
    }

    const approvalLink =
      subscription?.links?.find(
        (item: { rel?: string; href?: string }) => item.rel === "approve",
      )?.href || "";

    if (!approvalLink) {
      throw new Error("PayPal did not return an approval link.");
    }

    return Response.json({
      link: approvalLink,
      provider: "paypal",
      subscriptionId: subscription.id,
      plan,
      testMode:
        process.env.PAYPAL_ENVIRONMENT?.trim().toLowerCase() !== "live",
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to open PayPal checkout.",
      },
      { status: 502 },
    );
  }
}
