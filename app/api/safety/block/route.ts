import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  let payload: { memberId?: unknown };

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const memberId = typeof payload.memberId === "string" ? payload.memberId : "";

  if (!memberId) {
    return Response.json({ error: "A member is required." }, { status: 400 });
  }

  const { error } = await supabase.rpc("block_member", {
    p_blocked_id: memberId,
  });

  if (error) {
    return Response.json(
      { error: error.message || "Unable to block this member." },
      { status: 400 },
    );
  }

  return Response.json({ success: true });
}
