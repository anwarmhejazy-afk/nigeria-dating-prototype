import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/app");

  return <AuthShell eyebrow="Join the community" title="Create your account" description="Start with secure email registration. Your full dating profile comes next."><AuthForm mode="register" /></AuthShell>;
}
