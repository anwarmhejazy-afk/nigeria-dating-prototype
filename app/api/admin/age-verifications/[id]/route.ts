import { isAdmin } from "@/lib/admin";
import { sendPushToUser } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  decision?: unknown;
  note?: unknown;
};

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await context.params;

  const supabase = await createClient();
  const db = supabase as any;

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

  let payload: Payload;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const decision =
    typeof payload.decision === "string"
      ? payload.decision
      : "";

  const note =
    typeof payload.note === "string"
      ? payload.note.trim()
      : "";

  const allowed = new Set([
    "approve_photo",
    "require_id",
    "approve_id",
    "reject",
    "underage",
  ]);

  if (!allowed.has(decision)) {
    return Response.json(
      { error: "Invalid review action." },
      { status: 400 },
    );
  }

  const { data: verification } = await db
    .from("verification_requests")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await db.rpc(
    "admin_review_layered_verification",
    {
      p_request_id: id,
      p_decision: decision,
      p_note: note || null,
    },
  );

  if (error) {
    return Response.json(
      {
        error:
          error.message ||
          "Unable to review verification.",
      },
      { status: 400 },
    );
  }

  if (verification?.user_id) {
    const approved = [
      "approve_photo",
      "approve_id",
    ].includes(decision);

    await sendPushToUser(
      supabase,
      verification.user_id,
      {
        type: "verification",
        title: approved
          ? "AfroLove verification approved"
          : decision === "require_id"
            ? "Additional ID required"
            : "Verification updated",
        body: approved
          ? "Your verification has been approved."
          : note ||
            (decision === "require_id"
              ? "Government ID is required to complete your review."
              : "Your verification request was reviewed."),
        url: "/verification",
        tag: `verification-review-${id}`,
        metadata: {
          requestId: id,
          decision,
        },
      },
    );
  }

  return Response.json({ success: true });
}
