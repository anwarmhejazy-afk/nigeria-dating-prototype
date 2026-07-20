"use client";

import { useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { formatMoney, type MembershipPlan, type MembershipSnapshot } from "@/lib/membership";

type Transaction = {
  id: string;
  plan_slug: string;
  amount_minor: number;
  currency: string;
  status: string;
  created_at: string;
  paid_at: string | null;
};

const plans: Array<{
  slug: MembershipPlan;
  title: string;
  priceMinor: number;
  description: string;
  features: string[];
  highlighted?: boolean;
}> = [
  {
    slug: "free",
    title: "Free",
    priceMinor: 0,
    description: "Start meeting genuine people.",
    features: ["10 likes each day", "Standard discovery", "Matches and private chat"],
  },
  {
    slug: "premium",
    title: "Premium",
    priceMinor: 350000,
    description: "More choice and better matching tools.",
    features: ["Unlimited likes", "See who likes you", "5 Super Likes each week", "Rewind", "Advanced filters", "Read receipts"],
    highlighted: true,
  },
  {
    slug: "vip",
    title: "VIP",
    priceMinor: 750000,
    description: "Maximum visibility and priority discovery.",
    features: ["Everything in Premium", "10 Super Likes each week", "VIP badge", "Priority discovery", "One profile boost monthly"],
  },
];

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-[#F2C94C]/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#FFE58C]">{children}</span>;
}

export function MembershipDashboard({
  snapshot,
  transactions,
  checkoutConfigured,
  planPrices,
}: {
  snapshot: MembershipSnapshot;
  transactions: Transaction[];
  checkoutConfigured: boolean;
  planPrices: { currency: string; premium: number; vip: number };
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const checkout = async (plan: "premium" | "vip") => {
    setBusy(plan);
    setMessage("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to start checkout.");
      window.location.assign(payload.link);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start checkout.");
      setBusy(null);
    }
  };

  const cancel = async () => {
    setBusy("cancel");
    const response = await fetch("/api/billing/cancel", { method: "POST" });
    const payload = await response.json();
    setMessage(response.ok ? "Your membership will end after the current period." : payload.error || "Unable to cancel membership.");
    setBusy(null);
  };

  const boost = async () => {
    setBusy("boost");
    const response = await fetch("/api/billing/boost", { method: "POST" });
    const payload = await response.json();
    setMessage(response.ok ? "Your VIP profile boost is active for 30 minutes." : payload.error || "Unable to activate boost.");
    setBusy(null);
  };

  return (
    <main className="min-h-screen bg-[#07080b] text-white">
      <header className="border-b border-white/[0.08] bg-[#090b10]/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <BrandLogo size="sm" />
          <div className="flex items-center gap-2">
            <a href="/app" className="rounded-full border border-white/10 px-4 py-2 text-xs font-black text-white/60">Back to app</a>
            <a href="/billing" className="rounded-full bg-[#F2C94C] px-4 py-2 text-xs font-black text-black">Billing</a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[10px] font-black tracking-[0.3em] text-[#F2C94C]">AFROLOVE MEMBERSHIP</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Choose how you connect.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/42">Start free, then unlock more control, visibility and matching tools when you are ready.</p>
          </div>
          <div className="rounded-3xl border border-[#F2C94C]/20 bg-[#F2C94C]/[0.06] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F2C94C]">Current plan</p>
            <p className="mt-1 text-xl font-black">{snapshot.planName}</p>
            <p className="mt-1 text-xs text-white/35">{snapshot.isTest ? "Test membership" : "Live membership"} · {snapshot.status}</p>
          </div>
        </div>

        {!checkoutConfigured && (
          <div className="mt-6 rounded-3xl border border-blue-400/20 bg-blue-400/[0.06] p-5 text-sm leading-6 text-blue-100/70">
            Flutterwave is currently in safe setup mode. No real money can be collected yet. Super Admins can grant Premium or VIP test access from the monetisation dashboard while the Flutterwave account is being prepared.
          </div>
        )}

        {message && <div className="mt-5 rounded-2xl border border-[#F2C94C]/20 bg-[#F2C94C]/[0.07] px-4 py-3 text-sm font-bold text-[#FFE58C]">{message}</div>}

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => {
            const current = snapshot.plan === plan.slug;
            const price = plan.slug === "free" ? 0 : plan.slug === "premium" ? planPrices.premium : planPrices.vip;
            return (
              <article key={plan.slug} className={`relative rounded-[30px] border p-6 ${plan.highlighted ? "border-[#F2C94C]/55 bg-[#F2C94C]/[0.07] shadow-[0_0_50px_rgba(242,201,76,.08)]" : "border-white/[0.09] bg-white/[0.025]"}`}>
                {plan.highlighted && <div className="absolute right-5 top-5"><Badge>Most popular</Badge></div>}
                <h2 className="text-2xl font-black">{plan.title}</h2>
                <p className="mt-2 min-h-10 text-sm leading-5 text-white/40">{plan.description}</p>
                <div className="mt-6 flex items-end gap-2">
                  <span className="text-4xl font-black text-[#FFE58C]">{price === 0 ? "Free" : formatMoney(price, planPrices.currency)}</span>
                  {price > 0 && <span className="pb-1 text-xs text-white/35">/month</span>}
                </div>
                <div className="mt-6 space-y-3">
                  {plan.features.map((feature) => <div key={feature} className="flex gap-3 text-sm text-white/65"><span className="text-[#F2C94C]">✓</span><span>{feature}</span></div>)}
                </div>
                <div className="mt-7">
                  {current ? (
                    <button disabled className="w-full rounded-2xl border border-white/10 py-3 text-sm font-black text-white/35">Current plan</button>
                  ) : plan.slug === "free" ? (
                    <button disabled className="w-full rounded-2xl border border-white/10 py-3 text-sm font-black text-white/35">Included automatically</button>
                  ) : (
                    <button onClick={() => void checkout(plan.slug as "premium" | "vip")} disabled={busy !== null} className="w-full rounded-2xl bg-[#F2C94C] py-3 text-sm font-black text-black disabled:opacity-50">
                      {busy === plan.slug ? "Opening secure checkout…" : checkoutConfigured ? `Continue with ${plan.title}` : `Test ${plan.title} setup`}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {snapshot.plan === "vip" && (
          <div className="mt-6 rounded-3xl border border-[#F2C94C]/25 bg-[#F2C94C]/[0.06] p-5 sm:flex sm:items-center sm:justify-between">
            <div><h2 className="text-lg font-black">VIP monthly profile boost</h2><p className="mt-1 text-sm text-white/40">Move your profile higher in discovery for 30 minutes.</p></div>
            <button onClick={() => void boost()} disabled={busy !== null} className="mt-4 rounded-2xl bg-[#F2C94C] px-5 py-3 text-sm font-black text-black disabled:opacity-50 sm:mt-0">Activate boost</button>
          </div>
        )}

        {snapshot.plan !== "free" && !snapshot.cancelAtPeriodEnd && (
          <button onClick={() => void cancel()} disabled={busy !== null} className="mt-6 text-xs font-bold text-white/35 underline underline-offset-4">Cancel at the end of the current period</button>
        )}

        <section className="mt-12">
          <div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-black tracking-[0.25em] text-[#F2C94C]">PAYMENT HISTORY</p><h2 className="mt-2 text-2xl font-black">Your transactions</h2></div></div>
          <div className="mt-5 overflow-hidden rounded-3xl border border-white/[0.08]">
            {transactions.length ? transactions.map((transaction) => (
              <div key={transaction.id} className="flex flex-wrap items-center gap-4 border-b border-white/[0.06] bg-white/[0.025] p-4 last:border-0">
                <div className="min-w-0 flex-1"><p className="font-black capitalize">{transaction.plan_slug}</p><p className="mt-1 text-xs text-white/35">{new Date(transaction.created_at).toLocaleString()}</p></div>
                <p className="font-black text-[#FFE58C]">{formatMoney(transaction.amount_minor, transaction.currency)}</p>
                <span className="rounded-full bg-white/[0.07] px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white/55">{transaction.status}</span>
              </div>
            )) : <div className="bg-white/[0.025] p-8 text-center text-sm text-white/35">No payment history yet.</div>}
          </div>
        </section>
      </section>
    </main>
  );
}
