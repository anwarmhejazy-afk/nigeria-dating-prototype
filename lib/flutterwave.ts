import crypto from "node:crypto";

const API_BASE = "https://api.flutterwave.com/v3";

function secretKey() {
  return process.env.FLW_SECRET_KEY?.trim() || "";
}

export function flutterwaveConfigured() {
  return Boolean(secretKey());
}

async function requestFlutterwave<T>(path: string, init?: RequestInit): Promise<T> {
  const key = secretKey();
  if (!key) throw new Error("Flutterwave test keys are not configured yet.");
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
  if (!response.ok || payload?.status === "error") {
    throw new Error(payload?.message || "Flutterwave request failed.");
  }
  return payload as T;
}

export type FlutterwaveCheckoutInput = {
  txRef: string;
  amount: number;
  currency: string;
  redirectUrl: string;
  customer: { email: string; name: string; phone?: string };
  plan: "premium" | "vip";
  paymentPlanId?: string | null;
  subaccounts?: Array<{ id: string; transaction_split_ratio: number }>;
};

export async function createFlutterwaveCheckout(input: FlutterwaveCheckoutInput) {
  const body: Record<string, unknown> = {
    tx_ref: input.txRef,
    amount: input.amount,
    currency: input.currency,
    redirect_url: input.redirectUrl,
    customer: {
      email: input.customer.email,
      name: input.customer.name,
      phonenumber: input.customer.phone || undefined,
    },
    customizations: {
      title: `AfroLove ${input.plan === "vip" ? "VIP" : "Premium"}`,
      description: "Monthly AfroLove membership",
    },
    meta: { product: "afrolove_membership", plan: input.plan },
  };
  if (input.paymentPlanId) body.payment_plan = Number(input.paymentPlanId) || input.paymentPlanId;
  if (input.subaccounts?.length) body.subaccounts = input.subaccounts;

  return requestFlutterwave<{ status: string; data: { link: string } }>("/payments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function verifyFlutterwaveTransaction(transactionId: string) {
  return requestFlutterwave<{ status: string; data: Record<string, unknown> }>(
    `/transactions/${encodeURIComponent(transactionId)}/verify`,
  );
}

export function isValidFlutterwaveWebhook(rawBody: string, signature: string | null) {
  const secret = process.env.FLW_WEBHOOK_SECRET_HASH?.trim() || "";
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  const first = Buffer.from(expected);
  const second = Buffer.from(signature);
  return first.length === second.length && crypto.timingSafeEqual(first, second);
}
