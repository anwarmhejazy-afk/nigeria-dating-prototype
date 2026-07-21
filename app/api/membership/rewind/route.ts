import { createClient } from "@/lib/supabase/server";

export async function POST() {
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

  const { data, error } = await supabase.rpc(
    "record_rewind_usage",
  );

  if (error) {
    return Response.json(
      {
        error:
          error.message ||
          "Unable to record the rewind.",
      },
      { status: 400 },
    );
  }

  return Response.json({
    success: true,
    rewindsToday:
      typeof data === "number" ? data : null,
  });
}
