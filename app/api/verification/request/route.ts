import { sendPushToAdmins } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  selfiePath?: unknown;
  idDocumentPath?: unknown;
  note?: unknown;
};

export async function POST(request: Request) {
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

  if (!user.email_confirmed_at) {
    return Response.json(
      {
        error:
          "Confirm your email before requesting verification.",
      },
      { status: 403 },
    );
  }

  let payload: Payload;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid verification request." },
      { status: 400 },
    );
  }

  const selfiePath =
    typeof payload.selfiePath === "string"
      ? payload.selfiePath.trim()
      : "";

  const idDocumentPath =
    typeof payload.idDocumentPath === "string"
      ? payload.idDocumentPath.trim()
      : "";

  const note =
    typeof payload.note === "string"
      ? payload.note.trim()
      : "";

  if (
    !selfiePath.startsWith(`${user.id}/`)
  ) {
    return Response.json(
      { error: "Invalid selfie evidence." },
      { status: 400 },
    );
  }

  if (
    idDocumentPath &&
    !idDocumentPath.startsWith(`${user.id}/`)
  ) {
    return Response.json(
      { error: "Invalid identity evidence." },
      { status: 400 },
    );
  }

  const { data, error } = await db.rpc(
    "submit_layered_verification",
    {
      p_selfie_path: selfiePath,
      p_id_document_path:
        idDocumentPath || null,
      p_note: note || null,
    },
  );

  if (error) {
    return Response.json(
      {
        error:
          error.message ||
          "Unable to submit verification.",
      },
      { status: 400 },
    );
  }

  const { data: profile } = await db
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  await sendPushToAdmins(supabase, {
    type: "verification",
    title: "New verification evidence",
    body:
      `${
        profile?.display_name ||
        "A member"
      } submitted verification evidence.`,
    url: "/admin/age-verification",
    tag: `verification-${data}`,
    metadata: {
      requestId: data,
      memberId: user.id,
    },
  });

  return Response.json({
    success: true,
    requestId: data,
  });
}
