import type { SupabaseClient } from "@supabase/supabase-js";

export type MembershipPlan = "free" | "premium" | "vip";

export type MembershipFeatures = {
  daily_like_limit: number | null;
  weekly_super_like_limit: number;
  rewind: boolean;
  see_likes: boolean;
  advanced_filters: boolean;
  read_receipts: boolean;
  monthly_boosts: number;
  priority_discovery: boolean;
};

export type MembershipSnapshot = {
  plan: MembershipPlan;
  planName: string;
  status: string;
  currency: string;
  monthlyPriceMinor: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isTest: boolean;
  features: MembershipFeatures;
  usage: {
    likesToday: number;
    superLikesThisWeek: number;
    rewindsToday: number;
    boostsThisMonth: number;
  };
  incomingLikeCount: number;
};

export const freeMembership: MembershipSnapshot = {
  plan: "free",
  planName: "Free",
  status: "active",
  currency: "NGN",
  monthlyPriceMinor: 0,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  isTest: true,
  features: {
    daily_like_limit: 10,
    weekly_super_like_limit: 0,
    rewind: false,
    see_likes: false,
    advanced_filters: false,
    read_receipts: false,
    monthly_boosts: 0,
    priority_discovery: false,
  },
  usage: { likesToday: 0, superLikesThisWeek: 0, rewindsToday: 0, boostsThisMonth: 0 },
  incomingLikeCount: 0,
};

function numberValue(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function booleanValue(value: unknown) {
  return value === true;
}

export function parseMembershipSnapshot(value: unknown): MembershipSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return freeMembership;
  const row = value as Record<string, unknown>;
  const features = row.features && typeof row.features === "object" && !Array.isArray(row.features)
    ? row.features as Record<string, unknown>
    : {};
  const usage = row.usage && typeof row.usage === "object" && !Array.isArray(row.usage)
    ? row.usage as Record<string, unknown>
    : {};
  const plan = row.plan === "premium" || row.plan === "vip" ? row.plan : "free";

  return {
    plan,
    planName: typeof row.planName === "string" ? row.planName : plan === "vip" ? "VIP" : plan === "premium" ? "Premium" : "Free",
    status: typeof row.status === "string" ? row.status : "active",
    currency: typeof row.currency === "string" ? row.currency : "NGN",
    monthlyPriceMinor: numberValue(row.monthlyPriceMinor),
    currentPeriodEnd: typeof row.currentPeriodEnd === "string" ? row.currentPeriodEnd : null,
    cancelAtPeriodEnd: booleanValue(row.cancelAtPeriodEnd),
    isTest: row.isTest !== false,
    features: {
      daily_like_limit: features.daily_like_limit === null ? null : numberValue(features.daily_like_limit, 10),
      weekly_super_like_limit: numberValue(features.weekly_super_like_limit),
      rewind: booleanValue(features.rewind),
      see_likes: booleanValue(features.see_likes),
      advanced_filters: booleanValue(features.advanced_filters),
      read_receipts: booleanValue(features.read_receipts),
      monthly_boosts: numberValue(features.monthly_boosts),
      priority_discovery: booleanValue(features.priority_discovery),
    },
    usage: {
      likesToday: numberValue(usage.likesToday),
      superLikesThisWeek: numberValue(usage.superLikesThisWeek),
      rewindsToday: numberValue(usage.rewindsToday),
      boostsThisMonth: numberValue(usage.boostsThisMonth),
    },
    incomingLikeCount: numberValue(row.incomingLikeCount),
  };
}

export async function getMembershipSnapshot(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("get_membership_snapshot");
  if (error) return freeMembership;
  return parseMembershipSnapshot(data);
}

export function formatMoney(minor: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "NGN" ? 0 : 2,
  }).format(minor / 100);
}
