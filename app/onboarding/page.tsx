import { redirect } from "next/navigation";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { isAdmin } from "@/lib/admin";
import { toMemberProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const db = supabase as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/onboarding");
  }

  if (await isAdmin(supabase)) {
    redirect("/admin");
  }

  const { data: profile } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed) {
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

    redirect(
      verificationApproved
        ? "/app"
        : "/verification",
    );
  }

  return (
    <ProfileEditor
      mode="onboarding"
      userId={user.id}
      email={user.email ?? ""}
      initialProfile={
        profile
          ? toMemberProfile(profile)
          : null
      }
    />
  );
}
