"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Use at least 8 characters for your new password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The two passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.replace("/app");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-xs font-bold text-white/60">New password</span>
        <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3.5 text-sm outline-none focus:border-[#F2C94C]/70 focus:ring-4 focus:ring-[#F2C94C]/10" />
      </label>
      <label className="block">
        <span className="mb-2 block text-xs font-bold text-white/60">Confirm new password</span>
        <input required minLength={8} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3.5 text-sm outline-none focus:border-[#F2C94C]/70 focus:ring-4 focus:ring-[#F2C94C]/10" />
      </label>
      {error && <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.08] p-3 text-xs text-red-200">{error}</div>}
      <button disabled={loading} className="gold-shine w-full rounded-2xl bg-[#F2C94C] py-4 text-sm font-black text-black disabled:opacity-60">
        {loading ? "Updating..." : "Save new password"}
      </button>
    </form>
  );
}
