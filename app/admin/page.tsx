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

  return (
    <AdminDashboard
      initialData={data}
      currentAdminName={getAdminDisplayName(authData.user?.email)}
    />
  );
}
