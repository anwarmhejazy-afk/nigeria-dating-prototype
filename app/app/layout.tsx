import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { SessionBadge } from "@/components/auth/session-badge";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProtectedAppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  return (
    <>
      <SessionBadge
        email={user.email ?? "Signed in"}
        name={profile.display_name}
        avatarUrl={profile.avatar_url}
      />
      {children}
    </>
  );
}
