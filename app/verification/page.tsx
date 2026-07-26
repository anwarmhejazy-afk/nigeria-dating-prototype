import { redirect } from "next/navigation";
import { VerificationCenter } from "@/components/verification/verification-center";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function VerificationPage() {
  const supabase = await createClient();
  const db = supabase as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/verification");
  }

  if (await isAdmin(supabase)) {
    redirect("/admin");
  }

  const { data: profile } = await db
    .from("profiles")
    .select(
      "date_of_birth,onboarding_completed,age_verification_status,photo_verification_status,id_verification_status,verification_restricted,verification_restriction_reason",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  const { data: verificationRequest } =
    await db
      .from("verification_requests")
      .select(
        "status,request_type,admin_note,created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  return (
    <VerificationCenter
      userId={user.id}
      email={user.email ?? ""}
      emailConfirmed={Boolean(
        user.email_confirmed_at,
      )}
      initialProfile={{
        dateOfBirth:
          profile?.date_of_birth ?? null,
        ageStatus:
          profile?.age_verification_status ??
          "pending",
        photoStatus:
          profile?.photo_verification_status ??
          "pending",
        idStatus:
          profile?.id_verification_status ??
          "not_required",
        restricted:
          profile?.verification_restricted ===
          true,
        reason:
          profile?.verification_restriction_reason ??
          null,
      }}
      initialRequest={
        verificationRequest
          ? {
              status:
                verificationRequest.status,
              requestType:
                verificationRequest.request_type,
              adminNote:
                verificationRequest.admin_note,
            }
          : null
      }
    />
  );
}
