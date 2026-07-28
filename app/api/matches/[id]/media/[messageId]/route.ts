import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; messageId: string }> },
) {
  const { id, messageId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: message, error } = await supabase
    .from("messages")
    .select("id,match_id,message_type,media_url")
    .eq("id", messageId)
    .eq("match_id", id)
    .maybeSingle();

  if (error || !message || message.message_type !== "image" || !message.media_url) {
    return Response.json({ error: "Image unavailable." }, { status: 404 });
  }

  const { data, error: signedError } = await supabase.storage
    .from("chat-media")
    .createSignedUrl(message.media_url, 300);

  if (signedError || !data?.signedUrl) {
    return Response.json({ error: "Image unavailable." }, { status: 404 });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: data.signedUrl,
      "Cache-Control": "private, no-store",
    },
  });
}
