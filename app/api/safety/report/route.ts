import { createClient } from "@/lib/supabase/server";

const categories = new Set([
  "fake_profile",
  "harassment",
  "spam",
  "inappropriate_content",
  "underage",
  "other",
]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  let payload: {
    memberId?: unknown;
    category?: unknown;
    details?: unknown;
  };

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const memberId = typeof payload.memberId === "string" ? payload.memberId : "";
  const category = typeof payload.category === "string" ? payload.category : "";
  const details = typeof payload.details === "string" ? payload.details.trim() : "";

  if (!memberId || !categories.has(category)) {
    return Response.json({ error: "Invalid report details." }, { status: 400 });
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    reported_id: memberId,
    category,
    details: details.slice(0, 1000) || null,
  });

  if (error) {
    return Response.json(
      { error: error.message || "Unable to submit this report." },
      { status: 400 },
    );
  }

  return Response.json({ success: true });
}
