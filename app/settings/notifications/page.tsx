import { redirect } from "next/navigation";
import { NotificationSettings } from "@/components/notifications/notification-settings";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NotificationSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/settings/notifications");
  if (await isAdmin(supabase)) redirect("/admin");
  return <NotificationSettings />;
}
