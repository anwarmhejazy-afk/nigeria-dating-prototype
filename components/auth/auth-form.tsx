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
  // AFROLOVE_REGISTRATION_18_GATE
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [adultConfirmed, setAdultConfirmed] = useState(false);
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

        const { data: adminAccess, error: adminError } =
          await supabase.rpc("is_afrolove_admin");

        if (adminError) throw adminError;

        if (adminAccess) {
          router.replace("/admin");
        } else {
          const next = new URLSearchParams(window.location.search).get("next");
          router.replace(next?.startsWith("/") ? next : "/app");
        }

        router.refresh();
        return;
      }

      if (mode === "register") {
        if (!dateOfBirth) {
          throw new Error("Enter your date of birth.");
        }

        const birthDate =
          new Date(`${dateOfBirth}T00:00:00`);

        const today = new Date();

        const adultCutoff = new Date(
          today.getFullYear() - 18,
          today.getMonth(),
          today.getDate(),
        );

        if (
          Number.isNaN(birthDate.getTime()) ||
          birthDate > adultCutoff
        ) {
          throw new Error(
            "AfroLove is available only to adults aged 18 or older.",
          );
        }

        if (!adultConfirmed) {
          throw new Error(
            "Confirm that you are at least 18 years old.",
          );
        }


        if (password.length < 8) {
          throw new Error("Use at least 8 characters for your password.");
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              date_of_birth: dateOfBirth,
              adult_confirmation: true,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
          },
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          router.replace("/app");
          router.refresh();
        } else {
          setMessage(
            "Account created. Check your email and confirm your address to continue.",
          );
        }
        return;
      }

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });

      if (resetError) throw resetError;
      setMessage("Password reset email sent. Check your inbox for the secure link.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={submit} className="space-y-4">
        {mode === "register" && (
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-white/60">
              Full name
            </span>
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

        {mode === "register" && (
          <>
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-white/60">
                Date of birth
              </span>

              <input
                required
                type="date"
                value={dateOfBirth}
                onChange={(event) =>
                  setDateOfBirth(event.target.value)
                }
                autoComplete="bday"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3.5 text-sm outline-none transition focus:border-[#F2C94C]/70 focus:ring-4 focus:ring-[#F2C94C]/10"
              />
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <input
                required
                type="checkbox"
                checked={adultConfirmed}
                onChange={(event) =>
                  setAdultConfirmed(
                    event.target.checked,
                  )
                }
                className="mt-1 h-4 w-4 accent-[#F2C94C]"
              />

              <span className="text-xs leading-5 text-white/55">
                I confirm that I am at least 18 years
                old and that the date of birth entered
                above is accurate.
              </span>
            </label>
          </>
        )}

        <label className="block">
          <span className="mb-2 block text-xs font-bold text-white/60">
            Email address
          </span>
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
                <Link
                  href="/forgot-password"
                  className="text-[#F2C94C] hover:text-[#FFE58C]"
                >
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
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              placeholder="Minimum 8 characters"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3.5 text-sm outline-none transition placeholder:text-white/25 focus:border-[#F2C94C]/70 focus:ring-4 focus:ring-[#F2C94C]/10"
            />
          </label>
        )}

        {error && (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.08] p-3 text-xs leading-5 text-red-200">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.08] p-3 text-xs leading-5 text-emerald-200">
            {message}
          </div>
        )}

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
          <button
            disabled
            className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.035] py-3.5 text-sm font-bold text-white/35"
          >
            Continue with Google — provider setup required
          </button>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-white/40">
        {mode === "login" ? (
          <>
            New to AfroLove?{" "}
            <Link href="/register" className="font-black text-[#F2C94C]">
              Create an account
            </Link>
          </>
        ) : mode === "register" ? (
          <>
            Already registered?{" "}
            <Link href="/login" className="font-black text-[#F2C94C]">
              Sign in
            </Link>
          </>
        ) : (
          <Link href="/login" className="font-black text-[#F2C94C]">
            Return to sign in
          </Link>
        )}
      </p>
    </>
  );
}
