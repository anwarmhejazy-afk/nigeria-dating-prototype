import {
  deleteAfroLoveAccount,
} from "@/lib/account-deletion";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
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

  if (await isAdmin(supabase)) {
    return Response.json(
      {
        error:
          "Staff accounts cannot be deleted from member settings.",
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

  const confirmation =
    typeof payload.confirmation === "string"
      ? payload.confirmation.trim()
      : "";

  const reason =
    typeof payload.reason === "string"
      ? payload.reason.trim().slice(0, 500)
      : "";

  if (confirmation !== "DELETE") {
    return Response.json(
      {
        error:
          'Type DELETE exactly to confirm permanent account deletion.',
      },
      { status: 400 },
    );
  }

  try {
    const summary =
      await deleteAfroLoveAccount({
        userId: user.id,
        actor: {
          kind: "member",
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
      "AfroLove self-deletion failed:",
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
            : "AfroLove could not complete every deletion step safely. No further action was taken.",
      },
      { status: 500 },
    );
  }
}
