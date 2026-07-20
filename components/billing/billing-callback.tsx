"use client";

import { useEffect, useState } from "react";

export function BillingCallback({ transactionId, txRef, status }: { transactionId: string; txRef: string; status: string }) {
  const validRequest = Boolean(transactionId && txRef && ["successful", "completed"].includes(status));
  const [state, setState] = useState<"checking" | "success" | "failed">(validRequest ? "checking" : "failed");
  const [message, setMessage] = useState(validRequest ? "Confirming your payment securely…" : "The payment was not completed. No membership change was made.");

  useEffect(() => {
    if (!validRequest) return;
    void fetch(`/api/billing/verify?transaction_id=${encodeURIComponent(transactionId)}&tx_ref=${encodeURIComponent(txRef)}`)
      .then(async (response) => ({ response, payload: await response.json() }))
      .then(({ response, payload }) => {
        if (!response.ok) throw new Error(payload.error || "Payment verification failed.");
        setState("success");
        setMessage("Payment confirmed. Your AfroLove membership is active.");
      })
      .catch((error) => {
        setState("failed");
        setMessage(error instanceof Error ? error.message : "Payment verification failed.");
      });
  }, [transactionId, txRef, validRequest]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07080b] p-5 text-white">
      <section className="w-full max-w-lg rounded-[34px] border border-white/10 bg-white/[0.035] p-8 text-center">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl ${state === "success" ? "bg-emerald-400/15 text-emerald-300" : state === "failed" ? "bg-red-400/15 text-red-300" : "bg-[#F2C94C]/15 text-[#F2C94C]"}`}>
          {state === "success" ? "✓" : state === "failed" ? "!" : "…"}
        </div>
        <h1 className="mt-6 text-3xl font-black">{state === "checking" ? "Checking payment" : state === "success" ? "Membership activated" : "Payment not confirmed"}</h1>
        <p className="mt-3 text-sm leading-6 text-white/45">{message}</p>
        <a href={state === "success" ? "/app" : "/premium"} className="mt-7 block rounded-2xl bg-[#F2C94C] py-3 text-sm font-black text-black">{state === "success" ? "Continue to AfroLove" : "Return to memberships"}</a>
      </section>
    </main>
  );
}
