import crypto from "node:crypto";

const API_BASE = "https://api.paystack.co";

function secretKey() {
  return process.env.PAYSTACK_SECRET_KEY?.trim() || "";
}

export function paystackConfigured() {
  const key = secretKey();
  const explicitlyEnabled =
    process.env.PAYSTACK_CHECKOUT_ENABLED
      ?.trim()
      .toLowerCase() === "true";

  if (!explicitlyEnabled) return false;

  if (
    process.env.VERCEL_ENV === "production" &&
    key.startsWith("sk_test_")
  ) {
    return false;
  }

  return /^sk_(test|live)_/.test(key);
}

export function paystackIsTestMode() {
  return secretKey().startsWith("sk_test_");
}

async function requestPaystack<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const key = secretKey();

  if (!key) {
    throw new Error(
      "Paystack keys are not configured yet.",
    );
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.status === false) {
    throw new Error(
      payload?.message || "Paystack request failed.",
    );
  }

  return payload as T;
}

export type PaystackCheckoutInput = {
  reference: string;
  amountMinor: number;
  currency: string;
  callbackUrl: string;
  customer: {
    email: string;
    name: string;
  };
  userId: string;
  plan: "premium" | "vip";
};

export async function createPaystackCheckout(
  input: PaystackCheckoutInput,
) {
  return requestPaystack<{
    status: boolean;
    message: string;
    data: {
      authorization_url: string;
      access_code: string;
      reference: string;
    };
  }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.customer.email,
      amount: String(input.amountMinor),
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: {
        product: "afrolove_membership",
        plan: input.plan,
        user_id: input.userId,
        customer_name: input.customer.name,
      },
    }),
  });
}

export async function verifyPaystackTransaction(
  reference: string,
) {
  return requestPaystack<{
    status: boolean;
    message: string;
    data: Record<string, unknown>;
  }>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
}

export function isValidPaystackWebhook(
  rawBody: string,
  signature: string | null,
) {
  const key = secretKey();
  if (!key || !signature) return false;

  const expected = crypto
    .createHmac("sha512", key)
    .update(rawBody)
    .digest("hex");

  const first = Buffer.from(expected);
  const second = Buffer.from(signature);

  return (
    first.length === second.length &&
    crypto.timingSafeEqual(first, second)
  );
}
