import {
  deleteAfroLoveAccount,
} from "@/lib/account-deletion";
import { isAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const { id } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      {
        error: "Authentication required.",
      },
      { status: 401 },
    );
  }

  if (!(await isAdmin(supabase))) {
    return Response.json(
      {
        error: "Administrator access required.",
      },
      { status: 403 },
    );
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
    return Response.json(
      {
        error:
          "Only a super administrator can permanently delete a member account.",
      },
      { status: 403 },
    );
  }

  let payload: {
    confirmation?: unknown;
    reason?: unknown;
  };

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      {
        error: "Invalid account-deletion request.",
      },
      { status: 400 },
    );
  }

  try {
    const admin = createAdminClient();

    const {
      data: target,
      error: targetError,
    } = await admin
      .from("profiles")
      .select("id,email,display_name")
      .eq("id", id)
      .maybeSingle();

    if (targetError || !target) {
      return Response.json(
        {
          error: "The member account was not found.",
        },
        { status: 404 },
      );
    }

    const expected =
      `DELETE ${target.email || target.id}`;

    const confirmation =
      typeof payload.confirmation === "string"
        ? payload.confirmation.trim()
        : "";

    if (confirmation !== expected) {
      return Response.json(
        {
          error:
            `Type ${expected} exactly to confirm permanent deletion.`,
        },
        { status: 400 },
      );
    }

    const reason =
      typeof payload.reason === "string"
        ? payload.reason
            .trim()
            .slice(0, 500)
        : "";

    if (reason.length < 5) {
      return Response.json(
        {
          error:
            "Add a short administrator reason for the permanent deletion.",
        },
        { status: 400 },
      );
    }

    const summary =
      await deleteAfroLoveAccount({
        userId: id,
        actor: {
          kind: "admin",
          id: user.id,
        },
        reason,
      });

    return Response.json({
      success: true,
      summary,
    });
  } catch (caught) {
    console.error(
      "AfroLove administrator deletion failed:",
      caught,
    );

    return Response.json(
      {
        error:
          caught instanceof Error &&
          caught.message.includes(
            "not configured",
          )
            ? "Account deletion is temporarily unavailable."
            : "AfroLove could not complete every deletion step safely.",
      },
      { status: 500 },
    );
  }
}
