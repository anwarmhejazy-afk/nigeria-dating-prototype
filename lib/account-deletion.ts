import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type DeletionActor =
  | {
      kind: "member";
      id: string;
    }
  | {
      kind: "admin";
      id: string;
    };

type DeletionSummary = {
  userId: string;
  profilePhotos: number;
  avatars: number;
  verificationFiles: number;
  chatMedia: number;
};

type VerificationEvidenceRow = {
  id: string;
  selfie_path: string | null;
  id_document_path: string | null;
};

function text(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values.filter(
        (value): value is string =>
          typeof value === "string" &&
          value.trim().length > 0,
      ),
    ),
  );
}

async function listAllFiles(
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  rootPrefix: string,
) {
  const files: string[] = [];
  const queue = [rootPrefix];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const prefix = queue.shift() || "";

    if (visited.has(prefix)) continue;
    visited.add(prefix);

    let offset = 0;

    while (true) {
      const { data, error } = await admin.storage
        .from(bucket)
        .list(prefix, {
          limit: 1000,
          offset,
          sortBy: {
            column: "name",
            order: "asc",
          },
        });

      if (error) {
        throw new Error(
          `Unable to inspect ${bucket} storage safely.`,
        );
      }

      const items = data || [];

      for (const item of items) {
        const path = prefix
          ? `${prefix}/${item.name}`
          : item.name;

        if (item.id) {
          files.push(path);
        } else {
          queue.push(path);
        }
      }

      if (items.length < 1000) break;
      offset += items.length;
    }

    if (files.length > 20000 || queue.length > 20000) {
      throw new Error(
        `Storage cleanup for ${bucket} exceeded the safe limit.`,
      );
    }
  }

  return unique(files);
}

async function listChatMediaForSender(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const paths: string[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await admin
      .from("messages")
      .select("media_url")
      .eq("sender_id", userId)
      .eq("message_type", "image")
      .not("media_url", "is", null)
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(
        "Unable to inspect private chat media safely.",
      );
    }

    const rows = data || [];

    for (const row of rows) {
      const path = text(row.media_url);
      if (path) paths.push(path);
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return unique(paths);
}

async function removeFiles(
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  paths: string[],
) {
  let removed = 0;

  for (let index = 0; index < paths.length; index += 1000) {
    const batch = paths.slice(index, index + 1000);

    if (batch.length === 0) continue;

    const { error } = await admin.storage
      .from(bucket)
      .remove(batch);

    if (error) {
      throw new Error(
        `Unable to remove ${bucket} files safely.`,
      );
    }

    removed += batch.length;
  }

  return removed;
}

export async function deleteAfroLoveAccount({
  userId,
  actor,
  reason,
}: {
  userId: string;
  actor: DeletionActor;
  reason?: string | null;
}): Promise<DeletionSummary> {
  const admin = createAdminClient();

  const {
    data: profile,
    error: profileError,
  } = await admin
    .from("profiles")
    .select(
      "id,email,display_name,country,city,account_status,created_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("The member account was not found.");
  }

  const {
    data: staffMembership,
    error: staffError,
  } = await admin
    .from("admin_members")
    .select("user_id,role,is_active")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (staffError) {
    throw new Error(
      "Unable to verify staff-account protection.",
    );
  }

  if (staffMembership) {
    throw new Error(
      "Staff accounts cannot be deleted through member account deletion.",
    );
  }

  const [
    profilePhotoPaths,
    avatarPaths,
    verificationPaths,
    chatMediaPaths,
  ] = await Promise.all([
    listAllFiles(admin, "profile-photos", userId),
    listAllFiles(admin, "avatars", userId),
    listAllFiles(admin, "verification-evidence", userId),
    listChatMediaForSender(admin, userId),
  ]);

  const summary: DeletionSummary = {
    userId,
    profilePhotos: 0,
    avatars: 0,
    verificationFiles: 0,
    chatMedia: 0,
  };

  summary.profilePhotos = await removeFiles(
    admin,
    "profile-photos",
    profilePhotoPaths,
  );

  summary.avatars = await removeFiles(
    admin,
    "avatars",
    avatarPaths,
  );

  summary.verificationFiles = await removeFiles(
    admin,
    "verification-evidence",
    verificationPaths,
  );

  summary.chatMedia = await removeFiles(
    admin,
    "chat-media",
    chatMediaPaths,
  );

  const now = new Date().toISOString();

  const {
    error: reportUpdateError,
  } = await admin
    .from("reports")
    .update({
      status: "resolved",
      resolution:
        "The reported account was permanently deleted.",
      admin_action: "account_deleted",
      reviewed_at: now,
      updated_at: now,
    })
    .eq("reported_id", userId)
    .in("status", ["open", "reviewing"]);

  if (reportUpdateError) {
    throw new Error(
      "Unable to preserve and close safety cases safely.",
    );
  }

  const auditMetadata = {
    targetUserId: userId,
    targetEmail: profile.email,
    targetDisplayName: profile.display_name,
    targetCountry: profile.country,
    targetCity: profile.city,
    targetStatus: profile.account_status,
    targetCreatedAt: profile.created_at,
    actorKind: actor.kind,
    actorId: actor.id,
    reason: text(reason) || null,
    storageRemoved: {
      profilePhotos: summary.profilePhotos,
      avatars: summary.avatars,
      verificationFiles:
        summary.verificationFiles,
      chatMedia: summary.chatMedia,
    },
    safetyReportsPreserved: true,
    deletedAt: now,
  };

  const {
    error: auditError,
  } = await admin
    .from("admin_audit_logs")
    .insert({
      admin_id:
        actor.kind === "admin"
          ? actor.id
          : null,
      action:
        actor.kind === "admin"
          ? "admin_deleted_member_account"
          : "member_deleted_own_account",
      target_user_id: userId,
      metadata: auditMetadata,
    });

  if (auditError) {
    throw new Error(
      "Unable to create the required deletion audit record.",
    );
  }

  const {
    error: deleteError,
  } = await admin.auth.admin.deleteUser(
    userId,
    false,
  );

  if (deleteError) {
    await admin
      .from("admin_audit_logs")
      .insert({
        admin_id:
          actor.kind === "admin"
            ? actor.id
            : null,
        action: "account_deletion_failed",
        target_user_id: userId,
        metadata: {
          ...auditMetadata,
          failure:
            deleteError.message ||
            "Auth user deletion failed.",
        },
      });

    throw new Error(
      deleteError.message ||
        "Unable to delete the authentication account.",
    );
  }

  return summary;
}

export async function cleanupExpiredVerificationEvidence(
  limit = 100,
) {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const {
    data,
    error,
  } = await admin
    .from("verification_requests")
    .select(
      "id,selfie_path,id_document_path",
    )
    .lte("evidence_delete_after", now)
    .is("evidence_deleted_at", null)
    .order("evidence_delete_after", {
      ascending: true,
    })
    .limit(Math.max(1, Math.min(limit, 500)));

  if (error) {
    throw new Error(
      "Unable to load verification evidence due for deletion.",
    );
  }

  let processed = 0;
  let deletedFiles = 0;
  const failures: Array<{
    id: string;
    error: string;
  }> = [];

  for (const row of (data || []) as VerificationEvidenceRow[]) {
    const paths = unique([
      row.selfie_path,
      row.id_document_path,
    ]);

    try {
      deletedFiles += await removeFiles(
        admin,
        "verification-evidence",
        paths,
      );

      const {
        error: updateError,
      } = await admin
        .from("verification_requests")
        .update({
          selfie_path: null,
          id_document_path: null,
          evidence_deleted_at: now,
          updated_at: now,
        })
        .eq("id", row.id)
        .is("evidence_deleted_at", null);

      if (updateError) {
        throw new Error(
          updateError.message ||
            "Unable to mark evidence as deleted.",
        );
      }

      processed += 1;
    } catch (caught) {
      failures.push({
        id: row.id,
        error:
          caught instanceof Error
            ? caught.message
            : "Unknown cleanup failure.",
      });
    }
  }

  return {
    due: data?.length || 0,
    processed,
    deletedFiles,
    failures,
  };
}
