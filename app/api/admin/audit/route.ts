import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  if (!(await isAdmin(supabase))) return Response.json({ error: "Admin access required." }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const page = Number(params.get("page") || "1");
  const from = params.get("from");
  const until = params.get("until");
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000 ||
      [from, until].some(value => value !== null && !Number.isFinite(Date.parse(value))) ||
      (from && until && Date.parse(from) >= Date.parse(until))) {
    return Response.json({ error: "Choose a valid date range and page." }, { status: 400 });
  }
  let query = supabase.from("admin_audit_logs")
    .select("id,admin_id,action,target_user_id,report_id,metadata,created_at", { count: "exact" })
    .order("created_at", { ascending: false }).order("id", { ascending: false });
  if (from) query = query.gte("created_at", new Date(from).toISOString());
  if (until) query = query.lt("created_at", new Date(until).toISOString());
  const { data, count, error } = await query.range((page - 1) * 10, page * 10 - 1);
  if (error) return Response.json({ error: "Unable to load audit history." }, { status: 500 });
  const ids = [...new Set((data || []).flatMap(row => [row.admin_id, row.target_user_id]).filter(Boolean))];
  const names = new Map<string, string>();
  if (ids.length) {
    const result = await supabase.from("profiles").select("id,display_name").in("id", ids);
    if (result.error) return Response.json({ error: "Unable to load audit member names." }, { status: 500 });
    for (const profile of result.data || []) names.set(profile.id, profile.display_name);
  }
  return Response.json({ total: count || 0, items: (data || []).map(row => ({
    id: row.id, adminId: row.admin_id, action: row.action, targetUserId: row.target_user_id,
    reportId: row.report_id, metadata: row.metadata || {}, createdAt: row.created_at,
    adminName: names.get(row.admin_id) || "System / member", targetName: names.get(row.target_user_id) || "—",
  })) });
}
