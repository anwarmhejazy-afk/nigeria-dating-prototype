const PAYPAL_SANDBOX_BASE = "https://api-m.sandbox.paypal.com";
const PAYPAL_LIVE_BASE = "https://api-m.paypal.com";

function clientId() {
  return process.env.PAYPAL_CLIENT_ID?.trim() || "";
}

function clientSecret() {
  return process.env.PAYPAL_CLIENT_SECRET?.trim() || "";
}

export function paypalIsSandbox() {
  return process.env.PAYPAL_ENVIRONMENT?.trim().toLowerCase() !== "live";
}

function apiBase() {
  return paypalIsSandbox() ? PAYPAL_SANDBOX_BASE : PAYPAL_LIVE_BASE;
}

export function paypalConfigured() {
  const id = clientId();
  const secret = clientSecret();

  const explicitlyEnabled =
    process.env.PAYPAL_CHECKOUT_ENABLED?.trim().toLowerCase() === "true";

  if (!explicitlyEnabled || !id || !secret) {
    return false;
  }

  if (process.env.VERCEL_ENV === "production" && paypalIsSandbox()) {
    return false;
  }

  return true;
}

async function getAccessToken() {
  const id = clientId();
  const secret = clientSecret();

  if (!id || !secret) {
    throw new Error("PayPal credentials are not configured.");
  }

  const credentials = Buffer.from(`${id}:${secret}`).toString("base64");

  const response = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
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

async function requestPayPal<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      payload?.details?.[0]?.description ||
      payload?.message ||
      payload?.error_description ||
      "PayPal request failed.";

    throw new Error(message);
  }

  return payload as T;
}

export type PayPalOrderInput = {
  reference: string;
  amountMinor: number;
  currency: string;
  returnUrl: string;
  cancelUrl: string;
  userId: string;
  plan: "premium" | "vip";
};

function amountValue(amountMinor: number) {
  return (amountMinor / 100).toFixed(2);
}

export async function createPayPalOrder(input: PayPalOrderInput) {
  return requestPayPal<{
    id: string;
    status: string;
    links?: Array<{
      href: string;
      rel: string;
      method: string;
    }>;
  }>("/v2/checkout/orders", {
    method: "POST",
    headers: {
      "PayPal-Request-Id": input.reference,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.reference,
          custom_id: `${input.userId}:${input.plan}`,
          description: `AfroLove ${input.plan} membership`,
          amount: {
            currency_code: input.currency.toUpperCase(),
            value: amountValue(input.amountMinor),
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "AfroLove",
            user_action: "PAY_NOW",
            return_url: input.returnUrl,
            cancel_url: input.cancelUrl,
          },
        },
      },
    }),
  });
}

export async function getPayPalOrder(orderId: string) {
  return requestPayPal<Record<string, unknown>>(
    `/v2/checkout/orders/${encodeURIComponent(orderId)}`,
    {
      method: "GET",
    },
  );
}

export async function capturePayPalOrder(orderId: string) {
  return requestPayPal<Record<string, unknown>>(
    `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    {
      method: "POST",
      headers: {
        "PayPal-Request-Id": `capture-${orderId}`,
      },
      body: "{}",
    },
  );
}

export function getPayPalApprovalLink(order: {
  links?: Array<{ href: string; rel: string }>;
}) {
  return (
    order.links?.find((link) => link.rel === "payer-action")?.href ||
    order.links?.find((link) => link.rel === "approve")?.href ||
    ""
  );
}
