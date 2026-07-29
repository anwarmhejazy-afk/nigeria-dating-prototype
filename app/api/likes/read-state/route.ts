import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

const MAX_REASONABLE_LIKES = 1_000_000;

function isValidCount(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_REASONABLE_LIKES
  );
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: {
      user,
    },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        error: "Authentication required.",
      },
      {
        status: 401,
      },
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("member_notification_state")
    .select("seen_incoming_like_count")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error(
      "Could not read Likes notification state:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "The Likes notification state could not be loaded.",
      },
      {
        status: 500,
      },
    );
  }

  return NextResponse.json(
    {
      seenCount:
        data?.seen_incoming_like_count ?? 0,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(
  request: Request,
) {
  const supabase = await createClient();

  const {
    data: {
      user,
    },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        error: "Authentication required.",
      },
      {
        status: 401,
      },
    );
  }

  let body: {
    seenCount?: unknown;
    currentTotal?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid request body.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    !isValidCount(body.seenCount) ||
    !isValidCount(body.currentTotal)
  ) {
    return NextResponse.json(
      {
        error:
          "The Likes counts must be valid non-negative integers.",
      },
      {
        status: 400,
      },
    );
  }

  const {
    data: existing,
    error: readError,
  } = await supabase
    .from("member_notification_state")
    .select("seen_incoming_like_count")
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError) {
    console.error(
      "Could not inspect existing Likes notification state:",
      readError,
    );

    return NextResponse.json(
      {
        error:
          "The Likes notification state could not be updated.",
      },
      {
        status: 500,
      },
    );
  }

  const existingSeenCount =
    existing?.seen_incoming_like_count ?? 0;

  const normalizedExisting =
    Math.min(
      existingSeenCount,
      body.currentTotal,
    );

  const nextSeenCount =
    Math.max(
      normalizedExisting,
      Math.min(
        body.seenCount,
        body.currentTotal,
      ),
    );

  const {
    error: writeError,
  } = await supabase
    .from("member_notification_state")
    .upsert(
      {
        user_id: user.id,
        seen_incoming_like_count:
          nextSeenCount,
        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      },
    );

  if (writeError) {
    console.error(
      "Could not save Likes notification state:",
      writeError,
    );

    return NextResponse.json(
      {
        error:
          "The Likes notification state could not be updated.",
      },
      {
        status: 500,
      },
    );
  }

  return NextResponse.json({
    seenCount: nextSeenCount,
  });
}
