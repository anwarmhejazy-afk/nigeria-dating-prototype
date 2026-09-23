import { MonetizationDashboard } from "@/components/admin/monetization-dashboard";
import { getAdminDisplayName } from "@/lib/admin-identity";
import { paypalConfigured } from "@/lib/paypal";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminMonetizationPage() {
  const supabase = await createClient();
  const [{ data: authData }, settings, members, subscriptions, transactions] =
    await Promise.all([
      supabase.auth.getUser(),
    supabase.from("monetization_settings").select("*").eq("singleton", true).single(),
    supabase.from("profiles").select("id,display_name,email").eq("onboarding_completed", true).order("display_name").limit(300),
    supabase.from("member_subscriptions").select("id,user_id,plan_slug,status,current_period_end,is_test").order("created_at", { ascending: false }).limit(500),
    supabase.from("payment_transactions").select("id,plan_slug,amount_minor,currency,status,created_at").order("created_at", { ascending: false }).limit(500),
  ]);

  const fallback = {
    currency: "NGN",
    premium_price_minor: 350000,
    vip_price_minor: 750000,
    pass_recycle_hours: 24,
  };

  return (
    <MonetizationDashboard
      initialSettings={(settings.data || fallback) as typeof fallback}
      members={members.data || []}
      subscriptions={subscriptions.data || []}
      transactions={transactions.data || []}
      paypalConfigured={paypalConfigured()}
      currentAdminName={getAdminDisplayName(authData.user?.email)}
    />
  );
}
