import { sendPushToAdmins } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";

const categories = new Set([
  "harassment", "racism_hate_speech", "threats", "sexual_harassment",
  "scam_fraud", "asking_for_money", "business_solicitation", "spam",
  "fake_profile", "illegal_content", "inappropriate_content", "underage", "other",
]);

const evidenceScopes = new Set(["profile", "selected", "last_20", "full_conversation"]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });

  let payload: {
    memberId?: unknown; matchId?: unknown; category?: unknown; details?: unknown;
    evidenceScope?: unknown; selectedMessageIds?: unknown; blockMember?: unknown; unmatch?: unknown;
  };
  try { payload = await request.json(); } catch { return Response.json({ error: "Invalid request body." }, { status: 400 }); }

  const memberId = typeof payload.memberId === "string" ? payload.memberId : "";
  const matchId = typeof payload.matchId === "string" && payload.matchId ? payload.matchId : null;
  const category = typeof payload.category === "string" ? payload.category : "";
  const details = typeof payload.details === "string" ? payload.details.trim() : "";
  const evidenceScope = typeof payload.evidenceScope === "string" ? payload.evidenceScope : matchId ? "last_20" : "profile";
  const selectedMessageIds = Array.isArray(payload.selectedMessageIds)
    ? payload.selectedMessageIds.filter((value): value is string => typeof value === "string").slice(0, 100)
    : [];

  if (!memberId || !categories.has(category) || !evidenceScopes.has(evidenceScope)) {
    return Response.json({ error: "Invalid report details." }, { status: 400 });
  }
  if (!matchId && evidenceScope !== "profile") {
    return Response.json({ error: "Conversation evidence requires an active match." }, { status: 400 });
  }
  if (evidenceScope === "selected" && !selectedMessageIds.length) {
    return Response.json({ error: "Select at least one message as evidence." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("submit_safety_report", {
    p_reported_id: memberId,
    p_match_id: matchId,
    p_category: category,
    p_details: details.slice(0, 2000) || null,
    p_evidence_scope: evidenceScope,
    p_selected_message_ids: selectedMessageIds,
    p_block_member: Boolean(payload.blockMember),
    p_unmatch: Boolean(payload.unmatch),
  });

  if (error) return Response.json({ error: error.message || "Unable to submit this report." }, { status: 400 });

  await sendPushToAdmins(supabase, {
    type: "safety",
    title: "New AfroLove safety report",
    body: "A member submitted evidence for moderator review.",
    url: "/admin",
    tag: `safety-report-${data}`,
    metadata: { reportId: data, reporterId: user.id, reportedId: memberId },
  });

  return Response.json({ success: true, reportId: data, relationshipClosed: Boolean(payload.blockMember || payload.unmatch) });
}
