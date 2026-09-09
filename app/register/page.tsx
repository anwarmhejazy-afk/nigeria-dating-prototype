import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Join AfroLove – Create Your Free Dating Profile",
  description:
    "Create your AfroLove account and join African singles seeking genuine connections and meaningful relationships across Africa and the diaspora.",
  alternates: {
    canonical: "https://www.afroloveapp.com/register",
  },
};

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/app");

  return <AuthShell eyebrow="Join the AfroLove community" title="Create your account" description="Create your secure account, then build a profile that reflects your culture, values and relationship goals."><AuthForm mode="register" /></AuthShell>;
}
