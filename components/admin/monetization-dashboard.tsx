"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand/brand-logo";
import { formatMoney } from "@/lib/membership";

type Settings = {
  flutterwave_test_mode: boolean;
  checkout_enabled: boolean;
  currency: string;
  premium_price_minor: number;
  vip_price_minor: number;
  premium_payment_plan_id: string | null;
  vip_payment_plan_id: string | null;
  owner_subaccount_id: string | null;
  partner_subaccount_id: string | null;
  owner_split_ratio: number;
  partner_split_ratio: number;
  pass_recycle_hours: number;
};

type Member = { id: string; display_name: string; email: string | null };
type Subscription = {
  id: string;
  user_id: string;
  plan_slug: string;
  status: string;
  current_period_end: string | null;
  is_test: boolean;
};
type Transaction = {
  id: string;
  plan_slug: string;
  amount_minor: number;
  currency: string;
  status: string;
  created_at: string;
};

export function MonetizationDashboard({
  initialSettings,
  members,
  subscriptions,
  transactions,
  flutterwaveConfigured,
  currentAdminName,
}: {
  initialSettings: Settings;
  members: Member[];
  subscriptions: Subscription[];
  transactions: Transaction[];
  flutterwaveConfigured: boolean;
  currentAdminName: string;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [memberId, setMemberId] = useState(members[0]?.id || "");
  const [plan, setPlan] = useState("premium");
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [visibleSubscriptions, setVisibleSubscriptions] =
    useState(subscriptions);

  useEffect(() => {
    setVisibleSubscriptions(subscriptions);
  }, [subscriptions]);

  const memberMap = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members],
  );
  const revenueMinor = useMemo(
    () =>
      transactions
        .filter((item) => item.status === "successful")
        .reduce((sum, item) => sum + item.amount_minor, 0),
    [transactions],
  );
  const activeSubscriptions = visibleSubscriptions.filter((item) =>
    ["active", "trialing"].includes(item.status),
  );

  const saveSettings = async () => {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/monetization/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flutterwaveTestMode: settings.flutterwave_test_mode,
        checkoutEnabled: settings.checkout_enabled,
        currency: settings.currency,
        premiumPriceMinor: settings.premium_price_minor,
        vipPriceMinor: settings.vip_price_minor,
        premiumPaymentPlanId: settings.premium_payment_plan_id,
        vipPaymentPlanId: settings.vip_payment_plan_id,
        ownerSubaccountId: settings.owner_subaccount_id,
        partnerSubaccountId: settings.partner_subaccount_id,
        ownerSplitRatio: settings.owner_split_ratio,
        partnerSplitRatio: settings.partner_split_ratio,
        passRecycleHours: settings.pass_recycle_hours,
      }),
    });
    const payload = await response.json();
    setMessage(
      response.ok
        ? "Monetisation and discovery settings saved."
        : payload.error || "Unable to save settings.",
    );
    setBusy(false);
  };

  const grant = async () => {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/monetization/grant",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: memberId,
            plan,
            days,
          }),
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        setMessage(
          payload.error ||
            "Unable to update membership.",
        );
        return;
      }

      if (plan === "free") {
        setVisibleSubscriptions((items) =>
          items.filter(
            (item) => item.user_id !== memberId,
          ),
        );

        setMessage(
          "Membership revoked. The member is now on the Free plan.",
        );
      } else {
        setMessage(
          `${plan.toUpperCase()} test access granted successfully.`,
        );
      }

      /*
       * Update the server-rendered props after the immediate
       * client-side change. No manual browser refresh is needed.
       */
      router.refresh();
    } catch {
      setMessage(
        "Unable to update membership. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    "mt-2 w-full rounded-2xl border border-white/10 bg-[#0d0f14] px-4 py-3 text-sm text-white outline-none focus:border-[#F2C94C]/60";

  return (
    <main className="min-h-screen bg-[#07080b] text-white">
      <header className="border-b border-white/[0.08] bg-[#090b10]/95">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6">
          <BrandLogo size="sm" />
          <div className="h-8 w-px bg-white/10" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black">Monetisation & Memberships</p>
            <p className="text-[11px] text-white/35">
              Flutterwave test mode, 50/50 split and access controls
            </p>
          </div>
          <div className="rounded-2xl border border-[#F2C94C]/20 bg-[#F2C94C]/[0.06] px-3 py-2 text-right">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/35">Signed in as</p>
            <p className="mt-0.5 text-xs font-black text-[#FFE58C]">{currentAdminName}</p>
          </div>
          <a href="/admin" className="rounded-full border border-white/10 px-4 py-2 text-xs font-black text-white/55">Safety admin</a>
          <a href="/premium" className="rounded-full bg-[#F2C94C] px-4 py-2 text-xs font-black text-black">Member pricing</a>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Active memberships" value={activeSubscriptions.length.toLocaleString()} hint="Premium and VIP members" />
          <Metric label="Premium" value={activeSubscriptions.filter((item) => item.plan_slug === "premium").length.toLocaleString()} hint="Active or trialing" />
          <Metric label="VIP" value={activeSubscriptions.filter((item) => item.plan_slug === "vip").length.toLocaleString()} hint="Priority members" />
          <Metric label="Confirmed revenue" value={formatMoney(revenueMinor, settings.currency)} hint="Successful transactions only" />
        </div>

        {!flutterwaveConfigured && (
          <div className="mt-5 rounded-3xl border border-blue-400/20 bg-blue-400/[0.06] p-5 text-sm leading-6 text-blue-100/70">
            Flutterwave API keys are not added yet. Checkout remains disabled and no money can be collected. Use test memberships below safely.
          </div>
        )}
        {message && <div className="mt-5 rounded-2xl border border-[#F2C94C]/20 bg-[#F2C94C]/[0.07] px-4 py-3 text-sm font-bold text-[#FFE58C]">{message}</div>}

        <div className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
          <section className="rounded-[30px] border border-white/[0.08] bg-white/[0.025] p-6">
            <p className="text-[10px] font-black tracking-[0.25em] text-[#F2C94C]">FLUTTERWAVE TEST CONFIGURATION</p>
            <h1 className="mt-2 text-2xl font-black">Pricing, discovery and settlement</h1>
            <p className="mt-2 text-sm leading-6 text-white/38">The 1:1 ratio represents a 50/50 split after Flutterwave fees. Passed profiles recycle automatically after the selected testing period.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Currency"><input className={inputClass} value={settings.currency} onChange={(event) => setSettings({ ...settings, currency: event.target.value.toUpperCase() })} /></Field>
              <Field label="Test mode"><select className={inputClass} value={settings.flutterwave_test_mode ? "test" : "live"} onChange={(event) => setSettings({ ...settings, flutterwave_test_mode: event.target.value === "test" })}><option value="test">Test mode</option><option value="live">Live mode</option></select></Field>
              <Field label="Premium price in kobo"><input type="number" className={inputClass} value={settings.premium_price_minor} onChange={(event) => setSettings({ ...settings, premium_price_minor: Number(event.target.value) })} /></Field>
              <Field label="VIP price in kobo"><input type="number" className={inputClass} value={settings.vip_price_minor} onChange={(event) => setSettings({ ...settings, vip_price_minor: Number(event.target.value) })} /></Field>
              <Field label="Passed profile return time (hours)"><input type="number" min="1" max="720" className={inputClass} value={settings.pass_recycle_hours} onChange={(event) => setSettings({ ...settings, pass_recycle_hours: Number(event.target.value) })} /><span className="mt-1 block text-[10px] text-white/30">Use 24 hours for testing and about 168 hours (7 days) at launch.</span></Field>
              <Field label="Premium payment plan ID"><input className={inputClass} value={settings.premium_payment_plan_id || ""} onChange={(event) => setSettings({ ...settings, premium_payment_plan_id: event.target.value })} placeholder="Created in Flutterwave test dashboard" /></Field>
              <Field label="VIP payment plan ID"><input className={inputClass} value={settings.vip_payment_plan_id || ""} onChange={(event) => setSettings({ ...settings, vip_payment_plan_id: event.target.value })} placeholder="Created in Flutterwave test dashboard" /></Field>
              <Field label="Your subaccount ID"><input className={inputClass} value={settings.owner_subaccount_id || ""} onChange={(event) => setSettings({ ...settings, owner_subaccount_id: event.target.value })} placeholder="RS_..." /></Field>
              <Field label="Friend's subaccount ID"><input className={inputClass} value={settings.partner_subaccount_id || ""} onChange={(event) => setSettings({ ...settings, partner_subaccount_id: event.target.value })} placeholder="RS_..." /></Field>
              <Field label="Your split ratio"><input type="number" min="1" className={inputClass} value={settings.owner_split_ratio} onChange={(event) => setSettings({ ...settings, owner_split_ratio: Number(event.target.value) })} /></Field>
              <Field label="Friend's split ratio"><input type="number" min="1" className={inputClass} value={settings.partner_split_ratio} onChange={(event) => setSettings({ ...settings, partner_split_ratio: Number(event.target.value) })} /></Field>
            </div>
            <label className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4"><input type="checkbox" checked={settings.checkout_enabled} onChange={(event) => setSettings({ ...settings, checkout_enabled: event.target.checked })} /><span><span className="block text-sm font-black">Enable checkout</span><span className="mt-1 block text-xs text-white/35">Leave off until test keys, plans, webhook and both subaccounts are verified.</span></span></label>
            <button disabled={busy} onClick={() => void saveSettings()} className="mt-5 w-full rounded-2xl bg-[#F2C94C] py-3 text-sm font-black text-black disabled:opacity-50">Save settings</button>
          </section>

          <section className="rounded-[30px] border border-white/[0.08] bg-white/[0.025] p-6">
            <p className="text-[10px] font-black tracking-[0.25em] text-[#F2C94C]">MEMBERSHIP CONTROL</p>
            <h2 className="mt-2 text-2xl font-black">Grant, change or revoke</h2>
            <p className="mt-2 text-sm leading-6 text-white/38">No money is charged. Selecting Free immediately revokes active Premium or VIP test access.</p>
            <div className="mt-6 space-y-4">
              <Field label="Member"><select className={inputClass} value={memberId} onChange={(event) => setMemberId(event.target.value)}>{members.map((member) => <option key={member.id} value={member.id}>{member.display_name} — {member.email || "No email"}</option>)}</select></Field>
              <Field label="Plan"><select className={inputClass} value={plan} onChange={(event) => setPlan(event.target.value)}><option value="premium">Premium</option><option value="vip">VIP</option><option value="free">Free — revoke membership</option></select></Field>
              {plan !== "free" && <Field label="Number of days"><input type="number" min="1" max="365" className={inputClass} value={days} onChange={(event) => setDays(Number(event.target.value))} /></Field>}
            </div>
            <button disabled={busy || !memberId} onClick={() => void grant()} className={`mt-5 w-full rounded-2xl py-3 text-sm font-black disabled:opacity-50 ${plan === "free" ? "border border-red-400/30 bg-red-400/10 text-red-200" : "bg-[#F2C94C] text-black"}`}>{busy ? "Updating membership..." : plan === "free" ? "Revoke to Free" : "Grant test access"}</button>
            <div className="mt-5 rounded-2xl border border-white/[0.07] bg-black/20 p-4 text-xs leading-5 text-white/35"><strong className="text-white/65">Current default:</strong> Premium ₦3,500/month, VIP ₦7,500/month, split ratio 1:1.</div>
          </section>
        </div>

        <section className="mt-6 rounded-[30px] border border-white/[0.08] bg-white/[0.025] p-6">
          <p className="text-[10px] font-black tracking-[0.25em] text-[#F2C94C]">ACTIVE MEMBER ACCESS</p>
          <h2 className="mt-2 text-2xl font-black">Current Premium and VIP members</h2>
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.07]">
            {activeSubscriptions.length ? activeSubscriptions.map((subscription) => {
              const member = memberMap.get(subscription.user_id);
              return <div key={subscription.id} className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] bg-black/10 p-4 last:border-0"><div className="min-w-0 flex-1"><p className="font-black">{member?.display_name || "Unknown member"}</p><p className="mt-1 text-xs text-white/35">{member?.email || subscription.user_id}</p></div><span className="rounded-full border border-[#F2C94C]/25 bg-[#F2C94C]/10 px-3 py-1 text-[10px] font-black uppercase text-[#FFE58C]">{subscription.plan_slug}{subscription.is_test ? " · test" : ""}</span><span className="text-xs text-white/40">{subscription.current_period_end ? `Ends ${new Date(subscription.current_period_end).toLocaleDateString()}` : "No end date"}</span></div>;
            }) : <div className="p-8 text-center text-sm text-white/35">No active paid memberships.</div>}
          </div>
        </section>

        <div className="mt-6 flex justify-center"><a href="/admin" data-testid="back-to-admin-dashboard" className="inline-flex w-full max-w-md items-center justify-center rounded-2xl border border-[#F2C94C]/30 bg-[#F2C94C]/[0.07] px-5 py-3.5 text-sm font-black text-[#FFE58C] transition hover:border-[#F2C94C]/55 hover:bg-[#F2C94C]/[0.12]">← Back to admin dashboard</a></div>
      </section>
    </main>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5"><p className="text-3xl font-black text-[#FFE58C]">{value}</p><p className="mt-2 text-sm font-black">{label}</p><p className="mt-1 text-xs text-white/35">{hint}</p></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">{label}</span>{children}</label>;
}
