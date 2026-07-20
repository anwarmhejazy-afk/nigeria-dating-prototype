import { createFlutterwaveCheckout, flutterwaveConfigured } from "@/lib/flutterwave";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CheckoutConfiguration = {
  plan: "premium" | "vip";
  amountMinor: number;
  currency: string;
  providerPlanId: string | null;
  testMode: boolean;
  checkoutEnabled: boolean;
  subaccounts: Array<{ id: string; transaction_split_ratio: number }>;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });

  const payload = await request.json().catch(() => ({}));
  const plan = payload?.plan === "vip" ? "vip" : payload?.plan === "premium" ? "premium" : null;
  if (!plan) return Response.json({ error: "Choose Premium or VIP." }, { status: 400 });

  if (!flutterwaveConfigured()) {
    return Response.json({
      error: "Flutterwave test keys are not configured yet. An admin can still grant a test membership from the monetisation dashboard.",
    }, { status: 503 });
  }

  const [{ data: profile }, { data: configuration, error: configError }] = await Promise.all([
    supabase.from("profiles").select("display_name,email").eq("id", user.id).maybeSingle(),
    supabase.rpc("get_checkout_configuration", { p_plan_slug: plan }),
  ]);

  if (configError || !configuration) {
    return Response.json({ error: configError?.message || "Unable to load current pricing." }, { status: 400 });
  }

  const config = configuration as CheckoutConfiguration;
  if (!config.checkoutEnabled) {
    return Response.json({
      error: "Flutterwave checkout is safely disabled until the test account and webhook are configured.",
    }, { status: 503 });
  }

  const txRef = `afrolove-${plan}-${user.id.slice(0, 8)}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const splitSnapshot = {
    mode: config.subaccounts.length === 2 ? "50_50_ratio" : "main_account_only",
    subaccounts: config.subaccounts,
  };

  const { error: createError } = await supabase.rpc("create_payment_transaction", {
    p_plan_slug: plan,
    p_tx_ref: txRef,
    p_amount_minor: config.amountMinor,
    p_currency: config.currency,
    p_split_snapshot: splitSnapshot,
  });

  if (createError) return Response.json({ error: createError.message }, { status: 400 });

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");

  try {
    const checkout = await createFlutterwaveCheckout({
      txRef,
      amount: config.amountMinor / 100,
      currency: config.currency,
      redirectUrl: `${siteUrl}/billing/callback`,
      customer: {
        email: profile?.email || user.email || "",
        name: profile?.display_name || "AfroLove Member",
      },
      plan,
      paymentPlanId: config.providerPlanId,
      subaccounts: config.subaccounts,
    });

    await supabase.rpc("set_payment_checkout_link", {
      p_tx_ref: txRef,
      p_checkout_link: checkout.data.link,
    });

    return Response.json({ link: checkout.data.link, txRef, testMode: config.testMode });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Unable to open Flutterwave checkout.",
    }, { status: 502 });
  }
}
