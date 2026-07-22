"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
  member,
}: {
  snapshot: MembershipSnapshot;
  transactions: Transaction[];
  checkoutConfigured: boolean;
  planPrices: { currency: string; premium: number; vip: number };
  member: {
    displayName: string;
    avatarUrl: string | null;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [boostsThisMonth, setBoostsThisMonth] = useState(
    snapshot.usage.boostsThisMonth,
  );

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
    const monthlyLimit = Math.max(
      0,
      snapshot.features.monthly_boosts,
    );

    if (
      monthlyLimit > 0 &&
      boostsThisMonth >= monthlyLimit
    ) {
      setMessage(
        "Your monthly VIP boost has already been used.",
      );
      return;
    }

    setBusy("boost");
    setMessage("");

    const response = await fetch("/api/billing/boost", {
      method: "POST",
    });
    const payload = await response.json();

    if (response.ok) {
      setBoostsThisMonth((current) => current + 1);
      setMessage(
        "Your VIP profile boost is active for 30 minutes.",
      );
      router.refresh();
    } else {
      setMessage(
        payload.error ||
          "Unable to activate boost.",
      );
    }

    setBusy(null);
  };

  return (
    <main className="min-h-screen bg-[#07080b] text-white">
      <header
        data-testid="billing-responsive-header"
        className="border-b border-white/[0.08] bg-[#090b10]/95"
      >
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-3 py-3 sm:flex sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
          <BrandLogo
            size="sm"
            className="min-w-0 max-w-[150px] sm:max-w-none"
          />

          <div className="contents sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
            <div
              data-testid="billing-member-identity"
              className="col-span-3 row-start-2 flex w-full min-w-0 items-center gap-2 rounded-2xl border border-[#F2C94C]/20 bg-[#F2C94C]/[0.06] py-1.5 pl-1.5 pr-3 sm:order-1 sm:w-auto sm:max-w-[240px] sm:rounded-full"
            >
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.06] sm:h-9 sm:w-9">
                {member.avatarUrl ? (
                  <Image
                    src={member.avatarUrl}
                    alt={member.displayName}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-[#FFE58C] sm:text-xs">
                    {member.displayName
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <p className="truncate text-[11px] font-black text-white sm:text-xs">
                  {member.displayName}
                </p>
                <p className="mt-0.5 truncate text-[8px] font-black uppercase tracking-[0.1em] text-[#F2C94C] sm:text-[9px] sm:tracking-[0.12em]">
                  {snapshot.planName} member
                </p>
              </div>
            </div>

            <a
              href="/app"
              className="col-start-2 row-start-1 flex items-center justify-center rounded-full border border-white/10 px-3 py-2 text-[10px] font-black text-white/60 sm:order-2 sm:px-4 sm:text-xs"
            >
              <span className="sm:hidden">App</span>
              <span className="hidden sm:inline">Back to app</span>
            </a>

            <a
              href="/billing"
              className="col-start-3 row-start-1 flex items-center justify-center rounded-full bg-[#F2C94C] px-3 py-2 text-[10px] font-black text-black sm:order-3 sm:px-4 sm:text-xs"
            >
              Billing
            </a>
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


        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <UsageCard label="Likes today" value={String(snapshot.usage.likesToday)} hint={snapshot.features.daily_like_limit === null ? "Unlimited" : `Free limit ${snapshot.features.daily_like_limit}`} />
          <UsageCard label="Super Likes this week" value={String(snapshot.usage.superLikesThisWeek)} hint={`${snapshot.features.weekly_super_like_limit} available weekly`} />
          <UsageCard label="Rewinds today" value={String(snapshot.usage.rewindsToday)} hint={snapshot.features.rewind ? "Enabled" : "Premium required"} />
          <UsageCard
            label="Boosts this month"
            value={String(boostsThisMonth)}
            hint={
              snapshot.plan === "vip"
                ? `${Math.max(
                    1,
                    snapshot.features.monthly_boosts,
                  )} included monthly`
                : "VIP required"
            }
          />
        </section>

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
            <button
              onClick={() => void boost()}
              disabled={
                busy !== null ||
                boostsThisMonth >=
                  Math.max(
                    1,
                    snapshot.features.monthly_boosts,
                  )
              }
              className="mt-4 rounded-2xl bg-[#F2C94C] px-5 py-3 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-45 sm:mt-0"
            >
              {boostsThisMonth >=
              Math.max(
                1,
                snapshot.features.monthly_boosts,
              )
                ? "Monthly boost used"
                : busy === "boost"
                  ? "Activating…"
                  : "Activate boost"}
            </button>
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

function UsageCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-4"><p className="text-2xl font-black text-[#FFE58C]">{value}</p><p className="mt-1 text-sm font-black">{label}</p><p className="mt-1 text-xs text-white/35">{hint}</p></div>;
}
