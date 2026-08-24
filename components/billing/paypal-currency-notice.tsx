"use client";

import { useState } from "react";

type Plan = "premium" | "vip";

const paypalAmounts: Record<Plan, string> = {
  premium: "£3.50",
  vip: "£7.50",
};

const nairaAmounts: Record<Plan, string> = {
  premium: "₦3,500",
  vip: "₦7,500",
};

export function PayPalCurrencyNotice({
  plan,
  onConfirm,
  disabled,
}: {
  plan: Plan;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="w-full rounded-2xl bg-[#F2C94C] py-3 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continue with {plan === "vip" ? "VIP" : "Premium"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b0d12] p-6 text-white shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F2C94C]">
              Secure PayPal checkout
            </p>

            <h2 className="mt-3 text-2xl font-black">
              {plan === "vip" ? "VIP" : "Premium"} membership
            </h2>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm text-white/55">AfroLove price</p>
              <p className="mt-1 text-xl font-black text-[#F2C94C]">
                {nairaAmounts[plan]}/month
              </p>
            </div>

            <p className="mt-5 text-sm leading-6 text-white/60">
              PayPal will process this international subscription in{" "}
              <strong className="text-white">{paypalAmounts[plan]} GBP/month</strong>{" "}
              because NGN recurring payments are not supported for this PayPal
              checkout. Your bank or card provider may apply its own exchange rate
              or conversion fee.
            </p>

            <p className="mt-3 text-xs leading-5 text-white/40">
              You will be redirected securely to PayPal and returned to AfroLove
              after payment.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-white/70"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onConfirm();
                }}
                className="rounded-2xl bg-[#F2C94C] px-4 py-3 text-sm font-black text-black"
              >
                Continue to PayPal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
