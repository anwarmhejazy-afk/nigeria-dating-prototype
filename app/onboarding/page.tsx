import { redirect } from "next/navigation";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { toMemberProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/onboarding");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed) {
    redirect("/app");
  }

  return (
    <ProfileEditor
      mode="onboarding"
      userId={user.id}
      email={user.email ?? ""}
      initialProfile={profile ? toMemberProfile(profile) : null}
    />
  );
}
