import { sendAfroLoveEmail } from "@/lib/email";
import { sendPushToAdmins } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  selfiePath?: unknown;
  idDocumentPath?: unknown;
  note?: unknown;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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

  const displayName =
    typeof profile?.display_name === "string" &&
    profile.display_name.trim()
      ? profile.display_name.trim()
      : "A member";

  await sendPushToAdmins(supabase, {
    type: "verification",
    title: "New verification evidence",
    body:
      `${displayName} submitted verification evidence.`,
    url: "/admin/age-verification",
    tag: `verification-${data}`,
    metadata: {
      requestId: data,
      memberId: user.id,
    },
  });

  try {
    await Promise.allSettled([
      sendAfroLoveEmail({
        to: "anwar_hejazy@hotmail.com",
        subject: "New AfroLove verification submission",
        text: [
          `${displayName} submitted new verification evidence.`,
          "",
          `Request reference: ${data}`,
          "",
          "Review it in the AfroLove Admin dashboard.",
          "",
          "AfroLove Support",
          "support@afroloveapp.com",
        ].join("\n"),
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#171717;line-height:1.6">
            <h1 style="font-size:26px;margin-bottom:20px">New verification submission</h1>
            <p><strong>${escapeHtml(displayName)}</strong> submitted new verification evidence.</p>
            <p>Request reference: <strong>${escapeHtml(String(data))}</strong></p>
            <p><a href="https://www.afroloveapp.com/admin/age-verification">Open Admin Dashboard</a></p>
            <p style="margin-top:28px">AfroLove Support<br>support@afroloveapp.com</p>
          </div>
        `,
      }),
      sendAfroLoveEmail({
        to: "ungwadaemmanuel19@gmail.com",
        subject: "New AfroLove verification submission",
        text: [
          `${displayName} submitted new verification evidence.`,
          "",
          `Request reference: ${data}`,
          "",
          "Review it in the AfroLove Admin dashboard.",
          "",
          "AfroLove Support",
          "support@afroloveapp.com",
        ].join("\n"),
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#171717;line-height:1.6">
            <h1 style="font-size:26px;margin-bottom:20px">New verification submission</h1>
            <p><strong>${escapeHtml(displayName)}</strong> submitted new verification evidence.</p>
            <p>Request reference: <strong>${escapeHtml(String(data))}</strong></p>
            <p><a href="https://www.afroloveapp.com/admin/age-verification">Open Admin Dashboard</a></p>
            <p style="margin-top:28px">AfroLove Support<br>support@afroloveapp.com</p>
          </div>
        `,
      }),
    ]);
  } catch (emailError) {
    console.error(
      "AfroLove verification admin-email warning:",
      emailError,
    );
  }

  return Response.json({
    success: true,
    requestId: data,
  });
}
