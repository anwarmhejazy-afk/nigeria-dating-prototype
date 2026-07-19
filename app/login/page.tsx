import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
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
      <AuthForm mode="login" />
    </AuthShell>
  );
}
