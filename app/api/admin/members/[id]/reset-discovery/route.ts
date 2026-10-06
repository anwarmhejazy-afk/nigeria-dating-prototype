import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  if (!(await isAdmin(supabase))) {
    return Response.json(
      { error: "Admin access required." },
      { status: 403 },
    );
  }

  const { data: targetIsAdmin, error: targetAdminError } =
    await supabase.rpc("is_afrolove_admin", {
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
          "Staff accounts cannot be reset through Member management.",
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc(
    "admin_reset_member_discovery",
    {
      p_member_id: id,
    },
  );

  if (error) {
    return Response.json(
      {
        error:
          error.message ||
          "Unable to reset member discovery.",
      },
      { status: 400 },
    );
  }

  return Response.json({
    success: true,
    removedPasses: Number(data || 0),
  });
}
