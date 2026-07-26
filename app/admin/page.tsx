import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { getAdminDisplayName } from "@/lib/admin-identity";
import { loadAdminDashboard } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const [{ data: authData }, data] = await Promise.all([
    supabase.auth.getUser(),
    loadAdminDashboard(supabase),
  ]);


  const {
    count: ageVerificationCount,
    error: ageVerificationCountError,
  } = await (supabase as any)
    .from("verification_requests")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("status", "pending");

  if (ageVerificationCountError) {
    console.error(
      "Unable to load the Age & ID verification count:",
      ageVerificationCountError.message,
    );
  }

  return (
    <AdminDashboard
      initialData={data}
      currentAdminName={getAdminDisplayName(authData.user?.email)}
      ageVerificationCount={ageVerificationCount ?? 0}
    />
  );
}
