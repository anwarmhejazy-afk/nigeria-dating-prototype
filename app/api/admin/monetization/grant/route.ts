import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  if (!(await isAdmin(supabase))) return Response.json({ error: "Admin access required." }, { status: 403 });

  const payload = await request.json().catch(() => ({}));
  const userId = typeof payload.userId === "string" ? payload.userId : "";
  const plan = ["free", "premium", "vip"].includes(payload.plan) ? payload.plan : "free";
  const days = Math.max(1, Math.min(365, Number(payload.days) || 30));
  if (!userId) return Response.json({ error: "Choose a member." }, { status: 400 });

  const { data, error } = await supabase.rpc("admin_grant_test_membership", {
    p_user_id: userId,
    p_plan_slug: plan,
    p_days: days,
  });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true, subscriptionId: data });
}
