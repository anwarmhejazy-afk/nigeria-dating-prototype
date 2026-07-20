import { sendPushToUser } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });

  const result = await sendPushToUser(supabase, user.id, {
    type: "system",
    title: "AfroLove notifications are ready",
    body: "You will receive important likes, matches, messages and safety updates here.",
    url: "/app",
    tag: "afrolove-test",
  });

  return Response.json({ success: result.stored, delivered: result.delivered });
}
