import {
  createPaystackCheckout,
  paystackConfigured,
  paystackIsTestMode,
} from "@/lib/paystack";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CheckoutConfiguration = {
  plan: "premium" | "vip";
  amountMinor: number;
  currency: string;
  testMode: boolean;
  checkoutEnabled: boolean;
};

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
  const plan =
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

  if (!paystackConfigured()) {
    return Response.json(
      {
        error:
          "Paystack Test keys are not configured yet.",
      },
      { status: 503 },
    );
  }

  const [
    { data: profile },
    { data: configuration, error: configError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name,email")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.rpc("get_checkout_configuration", {
      p_plan_slug: plan,
    }),
  ]);

  if (configError || !configuration) {
    return Response.json(
      {
        error:
          configError?.message ||
          "Unable to load current pricing.",
      },
      { status: 400 },
    );
  }

  const config = configuration as CheckoutConfiguration;

  if (!config.checkoutEnabled) {
    return Response.json(
      {
        error:
          "Paystack checkout is disabled. Enable it from the admin monetisation dashboard after the Test integration is ready.",
      },
      { status: 503 },
    );
  }

  const customerEmail = profile?.email || user.email || "";

  if (!customerEmail) {
    return Response.json(
      { error: "A customer email is required." },
      { status: 400 },
    );
  }

  const txRef = `afrolove-${plan}-${user.id.slice(0, 8)}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const splitSnapshot = {
    provider: "paystack",
    mode: "main_account_only",
    subaccounts: [],
  };

  const { error: createError } = await supabase.rpc(
    "create_payment_transaction",
    {
      p_plan_slug: plan,
      p_tx_ref: txRef,
      p_amount_minor: config.amountMinor,
      p_currency: config.currency,
      p_split_snapshot: splitSnapshot,
    },
  );

  if (createError) {
    return Response.json(
      { error: createError.message },
      { status: 400 },
    );
  }

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    new URL(request.url).origin
  ).replace(/\/$/, "");

  try {
    const checkout = await createPaystackCheckout({
      reference: txRef,
      amountMinor: config.amountMinor,
      currency: config.currency,
      callbackUrl: `${siteUrl}/billing/callback`,
      customer: {
        email: customerEmail,
        name:
          profile?.display_name ||
          "AfroLove Member",
      },
      userId: user.id,
      plan,
    });

    await supabase.rpc("set_payment_checkout_link", {
      p_tx_ref: txRef,
      p_checkout_link:
        checkout.data.authorization_url,
    });

    return Response.json({
      link: checkout.data.authorization_url,
      txRef,
      testMode: paystackIsTestMode(),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to open Paystack checkout.",
      },
      { status: 502 },
    );
  }
}
