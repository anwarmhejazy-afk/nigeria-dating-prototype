import { redirect } from "next/navigation";

import {
  AccountDeletionDashboard,
} from "@/components/admin/account-deletion-dashboard";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  email: string | null;
  display_name: string | null;
  country: string | null;
  city: string | null;
  account_status: string | null;
  created_at: string;
};

export default async function AccountDeletionPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/login?next=/admin/account-deletion",
    );
  }

  if (!(await isAdmin(supabase))) {
    redirect("/app");
  }

  const {
    data: membership,
  } = await supabase
    .from("admin_members")
    .select("role,is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (membership?.role !== "super_admin") {
    redirect("/admin");
  }

  const [
    profilesResult,
    staffResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id,email,display_name,country,city,account_status,created_at",
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(300),
    supabase
      .from("admin_members")
      .select("user_id")
      .eq("is_active", true),
  ]);

  const staffIds = new Set(
    (staffResult.data || []).map(
      (row) => row.user_id,
    ),
  );

  const members = (
    (profilesResult.data || []) as Row[]
  )
    .filter(
      (row) => !staffIds.has(row.id),
    )
    .map((row) => ({
      id: row.id,
      email: row.email,
      displayName:
        row.display_name ||
        "AfroLove member",
      country:
        row.country || "Africa",
      city: row.city || "",
      accountStatus:
        row.account_status || "active",
      createdAt: row.created_at,
    }));

  return (
    <AccountDeletionDashboard
      initialMembers={members}
    />
  );
}
