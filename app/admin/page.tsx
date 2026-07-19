import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { loadAdminDashboard } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const data = await loadAdminDashboard(supabase);
  return <AdminDashboard initialData={data} />;
}
