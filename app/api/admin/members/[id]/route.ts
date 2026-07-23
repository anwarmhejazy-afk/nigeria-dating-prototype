import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  if (!(await isAdmin(supabase))) return Response.json({ error: "Admin access required." }, { status: 403 });

  const {
    data: targetIsAdmin,
    error: targetAdminError,
  } = await supabase.rpc("is_afrolove_admin", {
    p_user_id: id,
  });

  if (targetAdminError) {
    return Response.json(
      {
        error:
          targetAdminError.message ||
          "Unable to verify the target account.",
      },
      { status: 400 },
    );
  }

  if (targetIsAdmin) {
    return Response.json(
      {
        error:
          "Staff accounts cannot be moderated through Member management.",
      },
      { status: 400 },
    );
  }

  let payload: { action?: unknown; note?: unknown; durationHours?: unknown };
  try { payload = await request.json(); } catch { return Response.json({ error: "Invalid request body." }, { status: 400 }); }
  const action = typeof payload.action === "string" ? payload.action : "";
  const note = typeof payload.note === "string" ? payload.note.trim() : "";
  const durationHours = typeof payload.durationHours === "number" && Number.isFinite(payload.durationHours) ? Math.round(payload.durationHours) : null;

  const { error } = await supabase.rpc("admin_moderate_member", {
    p_member_id: id,
    p_action: action,
    p_note: note || null,
    p_duration_hours: durationHours,
  });
  if (error) return Response.json({ error: error.message || "Unable to update member." }, { status: 400 });
  return Response.json({ success: true });
}
