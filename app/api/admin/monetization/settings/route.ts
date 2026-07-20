import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  if (!(await isAdmin(supabase))) return Response.json({ error: "Admin access required." }, { status: 403 });
  const payload = await request.json().catch(() => ({}));

  const update = {
    flutterwave_test_mode: payload.flutterwaveTestMode !== false,
    checkout_enabled: payload.checkoutEnabled === true,
    currency: typeof payload.currency === "string" ? payload.currency.toUpperCase().slice(0, 3) : "NGN",
    premium_price_minor: Math.max(0, Math.round(Number(payload.premiumPriceMinor) || 350000)),
    vip_price_minor: Math.max(0, Math.round(Number(payload.vipPriceMinor) || 750000)),
    premium_payment_plan_id: typeof payload.premiumPaymentPlanId === "string" ? payload.premiumPaymentPlanId.trim() || null : null,
    vip_payment_plan_id: typeof payload.vipPaymentPlanId === "string" ? payload.vipPaymentPlanId.trim() || null : null,
    owner_subaccount_id: typeof payload.ownerSubaccountId === "string" ? payload.ownerSubaccountId.trim() || null : null,
    partner_subaccount_id: typeof payload.partnerSubaccountId === "string" ? payload.partnerSubaccountId.trim() || null : null,
    owner_split_ratio: Math.max(1, Number(payload.ownerSplitRatio) || 1),
    partner_split_ratio: Math.max(1, Number(payload.partnerSplitRatio) || 1),
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("monetization_settings").update(update).eq("singleton", true);
  if (error) return Response.json({ error: error.message }, { status: 400 });

  await Promise.all([
    supabase.from("membership_plans").update({ currency: update.currency, monthly_price_minor: update.premium_price_minor }).eq("slug", "premium"),
    supabase.from("membership_plans").update({ currency: update.currency, monthly_price_minor: update.vip_price_minor }).eq("slug", "vip"),
  ]);

  return Response.json({ success: true });
}
