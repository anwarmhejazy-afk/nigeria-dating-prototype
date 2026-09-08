import { sendAfroLoveEmail } from "@/lib/email";
import { sendPushToAdmins } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";

const categories = new Set([
  "harassment",
  "racism_hate_speech",
  "threats",
  "sexual_harassment",
  "scam_fraud",
  "asking_for_money",
  "business_solicitation",
  "spam",
  "fake_profile",
  "illegal_content",
  "inappropriate_content",
  "underage",
  "other",
]);

const evidenceScopes = new Set([
  "profile",
  "selected",
  "last_20",
  "full_conversation",
]);

const adminAlertEmails = [
  "anwar_hejazy@hotmail.com",
  "ungwadaemmanuel19@gmail.com",
];

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  let payload: {
    memberId?: unknown;
    matchId?: unknown;
    category?: unknown;
    details?: unknown;
    evidenceScope?: unknown;
    selectedMessageIds?: unknown;
    blockMember?: unknown;
    unmatch?: unknown;
  };

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const memberId =
    typeof payload.memberId === "string"
      ? payload.memberId
      : "";

  const matchId =
    typeof payload.matchId === "string" &&
    payload.matchId
      ? payload.matchId
      : null;

  const category =
    typeof payload.category === "string"
      ? payload.category
      : "";

  const details =
    typeof payload.details === "string"
      ? payload.details.trim()
      : "";

  const evidenceScope =
    typeof payload.evidenceScope === "string"
      ? payload.evidenceScope
      : matchId
        ? "last_20"
        : "profile";

  const selectedMessageIds =
    Array.isArray(payload.selectedMessageIds)
      ? payload.selectedMessageIds
          .filter(
            (value): value is string =>
              typeof value === "string",
          )
          .slice(0, 100)
      : [];

  if (
    !memberId ||
    !categories.has(category) ||
    !evidenceScopes.has(evidenceScope)
  ) {
    return Response.json(
      { error: "Invalid report details." },
      { status: 400 },
    );
  }

  if (!matchId && evidenceScope !== "profile") {
    return Response.json(
      {
        error:
          "Conversation evidence requires an active match.",
      },
      { status: 400 },
    );
  }

  if (
    evidenceScope === "selected" &&
    !selectedMessageIds.length
  ) {
    return Response.json(
      {
        error:
          "Select at least one message as evidence.",
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc(
    "submit_safety_report",
    {
      p_reported_id: memberId,
      p_match_id: matchId,
      p_category: category,
      p_details: details.slice(0, 2000) || null,
      p_evidence_scope: evidenceScope,
      p_selected_message_ids: selectedMessageIds,
      p_block_member: Boolean(payload.blockMember),
      p_unmatch: Boolean(payload.unmatch),
    },
  );

  if (error) {
    return Response.json(
      {
        error:
          error.message ||
          "Unable to submit this report.",
      },
      { status: 400 },
    );
  }

  await sendPushToAdmins(supabase, {
    type: "safety",
    title: "New AfroLove safety report",
    body:
      "A member submitted evidence for moderator review.",
    url: "/admin",
    tag: `safety-report-${data}`,
    metadata: {
      reportId: data,
      reporterId: user.id,
      reportedId: memberId,
    },
  });

  const { data: reporterProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const reporterName =
    reporterProfile?.display_name?.trim() ||
    user.user_metadata?.full_name ||
    "there";

  const safeReporterName =
    escapeHtml(String(reporterName));

  const publicReportReference =
    `AFR-${String(data).split("-")[0].toUpperCase()}`;

  const emailJobs: Promise<unknown>[] = [];

  if (user.email) {
    emailJobs.push(
      sendAfroLoveEmail({
        to: user.email,
        subject:
          "We received your AfroLove safety report",
        text: `Hi ${reporterName},

We received your safety report and it has been sent to the AfroLove moderation team for review.

Report reference: ${publicReportReference}

If you blocked or unmatched the member while submitting the report, that action has also been applied.

Thank you for helping us keep AfroLove safer.

AfroLove Support
support@afroloveapp.com`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;line-height:1.6;color:#222">
            <h1>We received your report</h1>
            <p>Hi ${safeReporterName},</p>
            <p>Your safety report has been sent to the <strong>AfroLove moderation team</strong> for review.</p>
            <p><strong>Report reference:</strong> ${escapeHtml(publicReportReference)}</p>
            <p>If you blocked or unmatched the member while submitting the report, that action has also been applied.</p>
            <p>Thank you for helping us keep AfroLove safer.</p>
            <p>AfroLove Support<br>support@afroloveapp.com</p>
          </div>
        `,
      }),
    );
  }

  emailJobs.push(
    sendAfroLoveEmail({
      to: adminAlertEmails,
      subject: `New AfroLove safety report — ${publicReportReference}`,
      text: `A new AfroLove safety report has been submitted.

Report reference: ${publicReportReference}
Category: ${category}

Please sign in to the AfroLove admin dashboard to review the report.

https://www.afroloveapp.com/admin

AfroLove Support`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;line-height:1.6;color:#222">
          <h1>New AfroLove safety report</h1>
          <p>A member has submitted a report that requires moderator review.</p>
          <p><strong>Report reference:</strong> ${escapeHtml(publicReportReference)}</p>
          <p><strong>Category:</strong> ${escapeHtml(category.replaceAll("_", " "))}</p>
          <p>
            <a href="https://www.afroloveapp.com/admin"
               style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px;">
              Open Admin Dashboard
            </a>
          </p>
          <p>For privacy and security, review the full evidence inside the AfroLove admin dashboard.</p>
        </div>
      `,
    }),
  );

  const results = await Promise.allSettled(
    emailJobs,
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error(
        "AfroLove safety report email failed:",
        result.reason,
      );
    }
  }

  return Response.json({
    success: true,
    reportId: data,
    relationshipClosed: Boolean(
      payload.blockMember ||
        payload.unmatch,
    ),
  });
}
