import { createClient } from "@/lib/supabase/server";

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

  let payload: { targetId?: unknown };

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const targetId =
    typeof payload.targetId === "string"
      ? payload.targetId
      : "";

  if (!targetId || targetId === user.id) {
    return Response.json(
      { error: "Invalid target member." },
      { status: 400 },
    );
  }

  // If these two users already have a genuine mutual match,
  // continue using AfroLove's normal match chat.
  const low =
    user.id.localeCompare(targetId) < 0
      ? user.id
      : targetId;

  const high =
    user.id.localeCompare(targetId) < 0
      ? targetId
      : user.id;

  const { data: existingMatch } = await supabase
    .from("matches")
    .select("id,is_active")
    .eq("user_low", low)
    .eq("user_high", high)
    .eq("is_active", true)
    .maybeSingle();

  if (existingMatch?.id) {
    return Response.json({
      type: "match",
      matchId: existingMatch.id,
      conversationId: null,
    });
  }

  const { data, error } = await supabase.rpc(
    "start_vip_direct_conversation",
    {
      p_target_id: targetId,
    },
  );

  if (error || !data) {
    return Response.json(
      {
        error:
          error?.message ||
          "Unable to start this conversation.",
      },
      { status: 400 },
    );
  }

  return Response.json({
    type: "direct",
    matchId: null,
    conversationId: data,
  });
}
