import { toMatchMessage } from "@/lib/matching";
import { sendPushToUser } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("messages")
    .select("id,match_id,sender_id,body,message_type,media_url,read_at,created_at")
    .eq("match_id", id)
    .order("created_at", { ascending: true })
    .limit(300);

  if (error) {
    return Response.json(
      { error: error.message || "Unable to load messages." },
      { status: 400 },
    );
  }

  return Response.json({
    messages: (data || []).map((row) => toMatchMessage(row)),
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  let payload: { body?: unknown };

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const body = typeof payload.body === "string" ? payload.body.trim() : "";

  if (!body || body.length > 2000) {
    return Response.json(
      { error: "Messages must contain between 1 and 2,000 characters." },
      { status: 400 },
    );
  }

  const { data: match } = await supabase
    .from("matches")
    .select("user_low,user_high,is_active")
    .eq("id", id)
    .maybeSingle();

  if (!match?.is_active || ![match.user_low, match.user_high].includes(user.id)) {
    return Response.json({ error: "This match is unavailable." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      match_id: id,
      sender_id: user.id,
      body,
      message_type: "text",
    })
    .select("id,match_id,sender_id,body,message_type,media_url,read_at,created_at")
    .single();

  if (error || !data) {
    return Response.json(
      { error: error?.message || "Unable to send message." },
      { status: 400 },
    );
  }

  const recipientId = match.user_low === user.id ? match.user_high : match.user_low;
  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  await sendPushToUser(supabase, recipientId, {
    type: "message",
    title: senderProfile?.display_name || "New AfroLove message",
    body: body.length > 120 ? `${body.slice(0, 117)}...` : body,
    url: "/app?tab=chat",
    tag: `message-${id}`,
    metadata: { matchId: id, messageId: data.id, senderId: user.id },
  });

  return Response.json({ message: toMatchMessage(data) });
}
