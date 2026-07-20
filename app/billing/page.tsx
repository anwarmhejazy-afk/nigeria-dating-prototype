import { redirect } from "next/navigation";
import { MembershipDashboard } from "@/components/billing/membership-dashboard";
import { flutterwaveConfigured } from "@/lib/flutterwave";
import { getMembershipSnapshot } from "@/lib/membership";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/billing");
  const [snapshot, history, planRows] = await Promise.all([
    getMembershipSnapshot(supabase),
    supabase.from("payment_transactions").select("id,plan_slug,amount_minor,currency,status,created_at,paid_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
    supabase.from("membership_plans").select("slug,currency,monthly_price_minor").in("slug", ["premium", "vip"]),
  ]);
  const premium = planRows.data?.find((item) => item.slug === "premium");
  const vip = planRows.data?.find((item) => item.slug === "vip");
  const planPrices = {
    currency: premium?.currency || vip?.currency || "NGN",
    premium: premium?.monthly_price_minor || 350000,
    vip: vip?.monthly_price_minor || 750000,
  };
  return <MembershipDashboard snapshot={snapshot} transactions={history.data || []} checkoutConfigured={flutterwaveConfigured()} planPrices={planPrices} />;
}
