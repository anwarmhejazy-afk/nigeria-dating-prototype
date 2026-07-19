"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "register" | "forgot";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;

        const next = new URLSearchParams(window.location.search).get("next");
        router.replace(next?.startsWith("/") ? next : "/app");
        router.refresh();
        return;
      }

      if (mode === "register") {
        if (password.length < 8) {
          throw new Error("Use at least 8 characters for your password.");
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
          },
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          router.replace("/app");
          router.refresh();
        } else {
          setMessage("Account created. Check your email and confirm your address to continue.");
        }
        return;
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        },
      );
      if (resetError) throw resetError;
      setMessage("Password reset email sent. Check your inbox for the secure link.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={submit} className="space-y-4">
        {mode === "register" && (
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-white/60">Full name</span>
            <input
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
              placeholder="Your full name"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3.5 text-sm outline-none transition placeholder:text-white/25 focus:border-[#F2C94C]/70 focus:ring-4 focus:ring-[#F2C94C]/10"
            />
          </label>
        )}

        <label className="block">
          <span className="mb-2 block text-xs font-bold text-white/60">Email address</span>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3.5 text-sm outline-none transition placeholder:text-white/25 focus:border-[#F2C94C]/70 focus:ring-4 focus:ring-[#F2C94C]/10"
          />
        </label>

        {mode !== "forgot" && (
          <label className="block">
            <span className="mb-2 flex items-center justify-between text-xs font-bold text-white/60">
              Password
              {mode === "login" && (
                <Link href="/forgot-password" className="text-[#F2C94C] hover:text-[#FFE58C]">
                  Forgot password?
                </Link>
              )}
            </span>
            <input
              required
              minLength={8}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              placeholder="Minimum 8 characters"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3.5 text-sm outline-none transition placeholder:text-white/25 focus:border-[#F2C94C]/70 focus:ring-4 focus:ring-[#F2C94C]/10"
            />
          </label>
        )}

        {error && <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.08] p-3 text-xs leading-5 text-red-200">{error}</div>}
        {message && <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.08] p-3 text-xs leading-5 text-emerald-200">{message}</div>}

        <button
          disabled={loading}
          className="gold-shine w-full rounded-2xl bg-[#F2C94C] py-4 text-sm font-black text-black transition hover:bg-[#FFE58C] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Please wait..."
            : mode === "login"
              ? "Sign in securely"
              : mode === "register"
                ? "Create my account"
                : "Send reset link"}
        </button>
      </form>

      {mode !== "forgot" && (
        <div className="mt-5">
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-white/25">
            <span className="h-px flex-1 bg-white/10" />
            Coming next
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <button disabled className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.035] py-3.5 text-sm font-bold text-white/35">
            Continue with Google — provider setup required
          </button>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-white/40">
        {mode === "login" ? (
          <>New to NAIJA MATCH? <Link href="/register" className="font-black text-[#F2C94C]">Create an account</Link></>
        ) : mode === "register" ? (
          <>Already registered? <Link href="/login" className="font-black text-[#F2C94C]">Sign in</Link></>
        ) : (
          <Link href="/login" className="font-black text-[#F2C94C]">Return to sign in</Link>
        )}
      </p>
    </>
  );
}
