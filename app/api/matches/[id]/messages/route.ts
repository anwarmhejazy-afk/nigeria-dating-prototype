import { toMatchMessage } from "@/lib/matching";
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

  return Response.json({ message: toMatchMessage(data) });
}
