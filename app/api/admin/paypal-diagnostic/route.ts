import { createClient as createAdminClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SUBSCRIPTION_ID = "I-AU6A4R8GMB3C";

async function paypalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim() || "";
  const secret = process.env.PAYPAL_CLIENT_SECRET?.trim() || "";

  if (!clientId || !secret) {
    throw new Error("PayPal credentials are missing.");
  }

  const environment =
    process.env.PAYPAL_ENVIRONMENT?.trim().toLowerCase();

  if (environment !== "live") {
    throw new Error(
      `Expected live PayPal environment, received "${environment || "missing"}".`,
    );
  }

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const response = await fetch(
    "https://api-m.paypal.com/v1/oauth2/token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    },
  );

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

export async function GET() {
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

  if (!(await isAdmin(supabase))) {
    return Response.json(
      { error: "Admin access required." },
      { status: 403 },
    );
  }

  try {
    const token = await paypalAccessToken();

    const [subscriptionResponse, webhooksResponse] = await Promise.all([
      fetch(
        `https://api-m.paypal.com/v1/billing/subscriptions/${encodeURIComponent(
          SUBSCRIPTION_ID,
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        },
      ),

      fetch("https://api-m.paypal.com/v1/notifications/webhooks", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }),
    ]);

    const subscription = await subscriptionResponse
      .json()
      .catch(() => ({}));

    const webhookPayload = await webhooksResponse
      .json()
      .catch(() => ({}));

    if (!subscriptionResponse.ok) {
      throw new Error(
        subscription?.message ||
          "Unable to retrieve PayPal subscription.",
      );
    }

    const customId =
      typeof subscription?.custom_id === "string"
        ? subscription.custom_id
        : "";

    const [userId, plan] = customId.split(":");

    const expectedWebhookId =
      process.env.PAYPAL_WEBHOOK_ID?.trim() || "";

    const wantedWebhookUrl =
      "https://www.afroloveapp.com/api/billing/paypal/webhook";

    const registeredWebhook = Array.isArray(webhookPayload?.webhooks)
      ? webhookPayload.webhooks.find(
          (item: any) => item?.url === wantedWebhookUrl,
        )
      : null;

    let profile = null;
    let authUser = null;
    let dbSubscription = null;
    let transactions: unknown[] = [];

    if (userId) {
      const serviceUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
      const serviceKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

      if (!serviceUrl || !serviceKey) {
        throw new Error("Supabase service credentials are missing.");
      }

      const admin = createAdminClient(serviceUrl, serviceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const [
        authResult,
        profileResult,
        subscriptionResult,
        transactionResult,
      ] = await Promise.all([
        admin.auth.admin.getUserById(userId),

        admin
          .from("profiles")
          .select(
            "id,email,display_name,onboarding_completed,account_status,is_verified,created_at",
          )
          .eq("id", userId)
          .maybeSingle(),

        admin
          .from("member_subscriptions")
          .select(
            "id,user_id,plan_slug,status,provider,provider_subscription_id,current_period_start,current_period_end,is_test",
          )
          .eq("provider_subscription_id", SUBSCRIPTION_ID)
          .maybeSingle(),

        admin
          .from("payment_transactions")
          .select(
            "id,user_id,subscription_id,plan_slug,amount_minor,currency,status,created_at,paid_at",
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (authResult.data?.user) {
        authUser = {
          id: authResult.data.user.id,
          email: authResult.data.user.email || null,
          createdAt: authResult.data.user.created_at || null,
          lastSignInAt: authResult.data.user.last_sign_in_at || null,
          providers:
            authResult.data.user.app_metadata?.providers || [],
        };
      }

      profile = profileResult.data || null;
      dbSubscription = subscriptionResult.data || null;
      transactions = transactionResult.data || [];
    }

    return Response.json(
      {
        diagnosticOnly: true,

        production: {
          paypalEnvironment:
            process.env.PAYPAL_ENVIRONMENT || "missing",
          webhookIdConfigured: Boolean(expectedWebhookId),
        },

        webhook: {
          url: wantedWebhookUrl,
          registered: Boolean(registeredWebhook),
          idMatchesVercel:
            Boolean(registeredWebhook?.id) &&
            registeredWebhook.id === expectedWebhookId,
          subscribedEvents:
            registeredWebhook?.event_types?.map(
              (event: any) => event?.name,
            ) || [],
        },

        paypalSubscription: {
          id: subscription?.id || null,
          status: subscription?.status || null,
          planId: subscription?.plan_id || null,
          customId: customId || null,
          paypalEmail:
            subscription?.subscriber?.email_address || null,
          startTime: subscription?.start_time || null,
          lastPayment:
            subscription?.billing_info?.last_payment || null,
          nextBillingTime:
            subscription?.billing_info?.next_billing_time || null,
        },

        afroLoveLink: {
          userId: userId || null,
          plan: plan || null,
          authUser,
          profile,
          databaseSubscription: dbSubscription,
          paymentTransactions: transactions,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "PayPal diagnostic failed.",
      },
      { status: 500 },
    );
  }
}
