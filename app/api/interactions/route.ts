import { getMatchSummary, type InteractionAction } from "@/lib/matching";
import { toMemberProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

const allowedActions = new Set<InteractionAction>([
  "like",
  "pass",
  "super_like",
]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  let payload: { targetId?: unknown; action?: unknown };

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const targetId = typeof payload.targetId === "string" ? payload.targetId : "";
  const action = typeof payload.action === "string" ? payload.action : "";

  if (!targetId || !allowedActions.has(action as InteractionAction)) {
    return Response.json({ error: "Invalid interaction." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("record_interaction", {
    p_target_id: targetId,
    p_action: action,
  });

  if (error) {
    return Response.json(
      { error: error.message || "Unable to save interaction." },
      { status: 400 },
    );
  }

  const result = Array.isArray(data) ? data[0] : null;
  const matched = Boolean(result?.matched);
  const matchId = typeof result?.match_id === "string" ? result.match_id : null;

  if (!matched || !matchId) {
    return Response.json({ matched: false, match: null });
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profileData) {
    return Response.json({ matched: true, match: null });
  }

  const match = await getMatchSummary(
    supabase,
    matchId,
    user.id,
    toMemberProfile(profileData),
  );

  return Response.json({ matched: true, match });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  let payload: { targetId?: unknown };

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const targetId = typeof payload.targetId === "string" ? payload.targetId : "";

  if (!targetId) {
    return Response.json({ error: "A target profile is required." }, { status: 400 });
  }

  const { error } = await supabase.rpc("undo_interaction", {
    p_target_id: targetId,
  });

  if (error) {
    return Response.json(
      { error: error.message || "Unable to undo interaction." },
      { status: 400 },
    );
  }

  return Response.json({ success: true });
}
