import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";

const MESSAGE_COLUMNS =
  "id,conversation_id,sender_id,body,message_type,media_url,read_at,created_at";

type DirectMessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  message_type: "text" | "image" | "voice";
  media_url: string | null;
  read_at: string | null;
  created_at: string;
};

async function conversationForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  conversationId: string,
  userId: string,
) {
  const { data } = await supabase
    .from("vip_direct_conversations")
    .select(
      "id,user_low,user_high,initiated_by,is_active,created_at,last_message_at",
    )
    .eq("id", conversationId)
    .maybeSingle();

  if (
    !data?.is_active ||
    ![data.user_low, data.user_high].includes(userId)
  ) {
    return null;
  }

  return data;
}

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
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const conversation = await conversationForUser(
    supabase,
    id,
    user.id,
  );

  if (!conversation) {
    return Response.json(
      { error: "This conversation is unavailable." },
      { status: 403 },
    );
  }

  const otherUserId =
    conversation.user_low === user.id
      ? conversation.user_high
      : conversation.user_low;

  const [
    { data: messages, error: messagesError },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("vip_direct_messages")
      .select(MESSAGE_COLUMNS)
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(300),

    supabase
      .from("profiles")
      .select(
        "id,display_name,avatar_url,photos,city,state,country,is_online",
      )
      .eq("id", otherUserId)
      .maybeSingle(),
  ]);

  if (messagesError) {
    return Response.json(
      {
        error:
          messagesError.message ||
          "Unable to load messages.",
      },
      { status: 400 },
    );
  }

  return Response.json({
    conversation: {
      id: conversation.id,
      initiatedBy: conversation.initiated_by,
      profile,
    },
    messages: (messages || []).map(
      (row: DirectMessageRow) => ({
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        body: row.body,
        messageType: row.message_type,
        mediaUrl: row.media_url,
        readAt: row.read_at,
        createdAt: row.created_at,
      }),
    ),
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
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const conversation = await conversationForUser(
    supabase,
    id,
    user.id,
  );

  if (!conversation) {
    return Response.json(
      { error: "This conversation is unavailable." },
      { status: 403 },
    );
  }

  let payload: { body?: unknown };

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const body =
    typeof payload.body === "string"
      ? payload.body.trim()
      : "";

  if (!body || body.length > 2000) {
    return Response.json(
      {
        error:
          "Messages must contain between 1 and 2,000 characters.",
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("vip_direct_messages")
    .insert({
      conversation_id: id,
      sender_id: user.id,
      body,
      message_type: "text",
    })
    .select(MESSAGE_COLUMNS)
    .single();

  if (error || !data) {
    return Response.json(
      {
        error:
          error?.message ||
          "Unable to send message.",
      },
      { status: 400 },
    );
  }

  await supabase.rpc(
    "touch_vip_direct_conversation",
    {
      p_conversation_id: id,
    },
  );

  const recipientId =
    conversation.user_low === user.id
      ? conversation.user_high
      : conversation.user_low;

  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  await sendPushToUser(supabase, recipientId, {
    type: "message",
    title:
      senderProfile?.display_name ||
      "New AfroLove message",
    body:
      body.length > 120
        ? `${body.slice(0, 117)}...`
        : body,
    url: `/direct/${id}`,
    tag: `vip-direct-${id}`,
    metadata: {
      conversationId: id,
      senderId: user.id,
    },
  });

  return Response.json({
    message: {
      id: data.id,
      conversationId: data.conversation_id,
      senderId: data.sender_id,
      body: data.body,
      messageType: data.message_type,
      mediaUrl: data.media_url,
      readAt: data.read_at,
      createdAt: data.created_at,
    },
  });
}
