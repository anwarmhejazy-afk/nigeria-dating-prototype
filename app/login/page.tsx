import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "AfroLove Login – Sign In to Your Account",
  description:
    "Sign in to AfroLove to access your matches, messages and pan-African dating experience.",
  alternates: {
    canonical: "https://www.afroloveapp.com/login",
  },
};

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect((await isAdmin(supabase)) ? "/admin" : "/app");
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to continue"
      description="Access your matches, messages and premium pan-African dating experience."
    >
      {params.draft === "saved" && (
        <p role="status" className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          Your draft is saved. Sign in anytime to continue.
        </p>
      )}
      <AuthForm mode="login" />
    </AuthShell>
  );
}
