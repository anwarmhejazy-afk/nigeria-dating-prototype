import { randomUUID } from "node:crypto";
import { toMatchMessage } from "@/lib/matching";
import { sendPushToUser } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";

const MESSAGE_COLUMNS =
  "id,match_id,sender_id,body,message_type,media_url,read_at,created_at";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

type MessageRow = {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  message_type: "text" | "image" | "voice";
  media_url: string | null;
  read_at: string | null;
  created_at: string;
};

function presentMessage(row: MessageRow) {
  const message = toMatchMessage(row);
  return {
    ...message,
    mediaUrl:
      row.message_type === "image" && row.media_url
        ? `/api/matches/${row.match_id}/media/${row.id}`
        : message.mediaUrl,
  };
}

async function activeMatchForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: string,
  userId: string,
) {
  const { data } = await supabase
    .from("matches")
    .select("user_low,user_high,is_active")
    .eq("id", matchId)
    .maybeSingle();

  if (!data?.is_active || ![data.user_low, data.user_high].includes(userId)) {
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
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!(await activeMatchForUser(supabase, id, user.id))) {
    return Response.json({ error: "This match is unavailable." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
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
    messages: ((data || []) as MessageRow[]).map(presentMessage),
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

  const match = await activeMatchForUser(supabase, id, user.id);
  if (!match) {
    return Response.json({ error: "This match is unavailable." }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") || "";
  let body = "";
  let messageType: "text" | "image" = "text";
  let mediaPath: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    body = typeof formData.get("caption") === "string"
      ? String(formData.get("caption")).trim()
      : "";

    if (!(file instanceof File)) {
      return Response.json({ error: "Choose an image to send." }, { status: 400 });
    }

    const extension = IMAGE_TYPES.get(file.type);
    if (!extension) {
      return Response.json(
        { error: "Only JPG, PNG and WebP images are supported." },
        { status: 400 },
      );
    }

    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
      return Response.json(
        { error: "Images must be smaller than 8 MB." },
        { status: 400 },
      );
    }

    if (body.length > 2000) {
      return Response.json(
        { error: "Photo captions cannot exceed 2,000 characters." },
        { status: 400 },
      );
    }

    messageType = "image";
    mediaPath = `${id}/${user.id}/${randomUUID()}.${extension}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("chat-media")
      .upload(mediaPath, bytes, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return Response.json(
        { error: uploadError.message || "Unable to upload the image." },
        { status: 400 },
      );
    }
  } else {
    let payload: { body?: unknown };
    try {
      payload = await request.json();
    } catch {
      return Response.json({ error: "Invalid request body." }, { status: 400 });
    }

    body = typeof payload.body === "string" ? payload.body.trim() : "";
    if (!body || body.length > 2000) {
      return Response.json(
        { error: "Messages must contain between 1 and 2,000 characters." },
        { status: 400 },
      );
    }
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      match_id: id,
      sender_id: user.id,
      body,
      message_type: messageType,
      media_url: mediaPath,
    })
    .select(MESSAGE_COLUMNS)
    .single();

  if (error || !data) {
    if (mediaPath) {
      await supabase.storage.from("chat-media").remove([mediaPath]);
    }
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

  const notificationBody = messageType === "image"
    ? body
      ? `📷 ${body.slice(0, 116)}`
      : "📷 Sent you a photo"
    : body.length > 120
      ? `${body.slice(0, 117)}...`
      : body;

  await sendPushToUser(supabase, recipientId, {
    type: "message",
    title: senderProfile?.display_name || "New AfroLove message",
    body: notificationBody,
    url: "/app?tab=chat",
    tag: `message-${id}`,
    metadata: { matchId: id, messageId: data.id, senderId: user.id },
  });

  return Response.json({ message: presentMessage(data as MessageRow) });
}
