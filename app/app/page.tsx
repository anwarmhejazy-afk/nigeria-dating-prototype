import { redirect } from "next/navigation";
import { DatingApp } from "@/components/dating/dating-app";
import { loadMatchingInitialData } from "@/lib/matching";
import { toMemberProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MemberAppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  const memberProfile = toMemberProfile(profile);
  const initialData = await loadMatchingInitialData(
    supabase,
    user.id,
    memberProfile,
  );

  return (
    <DatingApp
      memberProfile={memberProfile}
      initialData={initialData}
    />
  );
}
