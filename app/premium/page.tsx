import { redirect } from "next/navigation";
import { MembershipDashboard } from "@/components/billing/membership-dashboard";
import { flutterwaveConfigured } from "@/lib/flutterwave";
import { getMembershipSnapshot } from "@/lib/membership";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PremiumPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/premium");
  const [snapshot, history, planRows, profile] = await Promise.all([
    getMembershipSnapshot(supabase),
    supabase.from("payment_transactions").select("id,plan_slug,amount_minor,currency,status,created_at,paid_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
    supabase.from("membership_plans").select("slug,currency,monthly_price_minor").in("slug", ["premium", "vip"]),
    supabase.from("profiles").select("display_name,avatar_url").eq("id", user.id).maybeSingle(),
  ]);
  const premium = planRows.data?.find((item) => item.slug === "premium");
  const vip = planRows.data?.find((item) => item.slug === "vip");
  const planPrices = {
    currency: premium?.currency || vip?.currency || "NGN",
    premium: premium?.monthly_price_minor || 350000,
    vip: vip?.monthly_price_minor || 750000,
  };
  const member = {
    displayName:
      profile.data?.display_name ||
      (typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null) ||
      user.email?.split("@")[0] ||
      "AfroLove Member",
    avatarUrl:
      profile.data?.avatar_url ||
      (typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : null),
  };

  return (
    <MembershipDashboard
      snapshot={snapshot}
      transactions={history.data || []}
      checkoutConfigured={flutterwaveConfigured()}
      planPrices={planPrices}
      member={member}
    />
  );
}
