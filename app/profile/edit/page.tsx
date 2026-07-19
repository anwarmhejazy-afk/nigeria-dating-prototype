import { redirect } from "next/navigation";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { isAdmin } from "@/lib/admin";
import { toMemberProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/profile/edit");
  }

  if (await isAdmin(supabase)) {
    redirect("/admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <ProfileEditor
      mode="edit"
      userId={user.id}
      email={user.email ?? ""}
      initialProfile={toMemberProfile(profile)}
    />
  );
}
