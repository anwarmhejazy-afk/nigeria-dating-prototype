import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

  const { data: requests, error } = await db
    .from("verification_requests")
    .select(
      "id,user_id,request_type,selfie_path,id_document_path,member_note,admin_note,created_at",
    )
    .eq("status", "pending")
    .order("created_at", {
      ascending: true,
    })
    .limit(100);

  if (error) {
    return Response.json(
      {
        error:
          error.message ||
          "Unable to load verification requests.",
      },
      { status: 400 },
    );
  }

  const memberIds = Array.from(
    new Set(
      (requests || []).map(
        (row: any) => row.user_id,
      ),
    ),
  );

  const { data: profiles } =
    memberIds.length > 0
      ? await db
          .from("profiles")
          .select(
            "id,display_name,email,date_of_birth,age_verification_status,photo_verification_status,id_verification_status",
          )
          .in("id", memberIds)
      : { data: [] };

  type VerificationProfileRow = {
    id: string;
    display_name: string | null;
    email: string | null;
    date_of_birth: string | null;
    age_verification_status: string | null;
    photo_verification_status: string | null;
    id_verification_status: string | null;
  };

  const profileMap =
    new Map<string, VerificationProfileRow>(
      (
        (profiles || []) as VerificationProfileRow[]
      ).map((profile) => [
        profile.id,
        profile,
      ]),
    );

  const items = await Promise.all(
    (requests || []).map(async (row: any) => {
      const profile =
        profileMap.get(row.user_id);

      const selfieSigned = row.selfie_path
        ? await supabase.storage
            .from("verification-evidence")
            .createSignedUrl(
              row.selfie_path,
              600,
            )
        : null;

      const idSigned = row.id_document_path
        ? await supabase.storage
            .from("verification-evidence")
            .createSignedUrl(
              row.id_document_path,
              600,
            )
        : null;

      return {
        id: row.id,
        userId: row.user_id,
        requestType:
          row.request_type || "photo",
        selfieUrl:
          selfieSigned?.data?.signedUrl ||
          null,
        idUrl:
          idSigned?.data?.signedUrl ||
          null,
        memberNote: row.member_note,
        adminNote: row.admin_note,
        createdAt: row.created_at,
        member: {
          displayName:
            profile?.display_name ||
            "AfroLove member",
          email: profile?.email || "",
          dateOfBirth:
            profile?.date_of_birth || null,
          ageStatus:
            profile?.age_verification_status ||
            "pending",
          photoStatus:
            profile?.photo_verification_status ||
            "pending",
          idStatus:
            profile?.id_verification_status ||
            "not_required",
        },
      };
    }),
  );

  return Response.json({ items });
}
