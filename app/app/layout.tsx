import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { SessionBadge } from "@/components/auth/session-badge";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProtectedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const db = supabase as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app");
  }

  if (await isAdmin(supabase)) {
    redirect("/admin");
  }

  const { data: profile } = await db
    .from("profiles")
    .select(
      [
        "display_name",
        "avatar_url",
        "onboarding_completed",
        "account_status",
        "age_verification_status",
        "photo_verification_status",
        "id_verification_status",
        "verification_restricted",
      ].join(","),
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  if (
    ["suspended", "banned"].includes(
      profile.account_status || "",
    )
  ) {
    redirect("/account-status");
  }

  const verificationApproved =
    Boolean(user.email_confirmed_at) &&
    profile.age_verification_status ===
      "confirmed" &&
    profile.photo_verification_status ===
      "approved" &&
    ["not_required", "approved"].includes(
      profile.id_verification_status || "",
    ) &&
    profile.verification_restricted === false;

  if (!verificationApproved) {
    redirect("/verification");
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
