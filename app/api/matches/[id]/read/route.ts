import { createClient } from "@/lib/supabase/server";

export async function POST(
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

  const { error } = await supabase.rpc("mark_match_read", {
    p_match_id: id,
  });

  if (error) {
    return Response.json(
      { error: error.message || "Unable to update read receipts." },
      { status: 400 },
    );
  }

  return Response.json({ success: true });
}
