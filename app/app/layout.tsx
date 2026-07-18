import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { SessionBadge } from "@/components/auth/session-badge";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProtectedAppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app");
  }

  return (
    <>
      <SessionBadge email={user.email ?? "Signed in"} />
      {children}
    </>
  );
}
