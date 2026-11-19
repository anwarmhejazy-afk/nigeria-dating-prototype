import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      {
        error:
          "Authentication required.",
      },
      {
        status: 401,
      },
    );
  }

  if (!(await isAdmin(supabase))) {
    return Response.json(
      {
        error:
          "Admin access required.",
      },
      {
        status: 403,
      },
    );
  }

  const payload =
    await request
      .json()
      .catch(() => ({}));

  const userId =
    typeof payload.userId ===
    "string"
      ? payload.userId.trim()
      : "";

  const plan =
    payload.plan === "vip"
      ? "vip"
      : payload.plan === "premium"
        ? "premium"
        : "";

  const days =
    Number(payload.days);

  const reason =
    typeof payload.reason ===
    "string"
      ? payload.reason.trim()
      : "";

  const campaignCode =
    typeof payload.campaignCode ===
    "string"
      ? payload.campaignCode.trim()
      : "";

  if (!userId) {
    return Response.json(
      {
        error:
          "Choose a member.",
      },
      {
        status: 400,
      },
    );
  }

  if (!plan) {
    return Response.json(
      {
        error:
          "Choose Premium or VIP.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    !Number.isFinite(days) ||
    days < 1 ||
    days > 365
  ) {
    return Response.json(
      {
        error:
          "Duration must be between 1 and 365 days.",
      },
      {
        status: 400,
      },
    );
  }

  if (!reason) {
    return Response.json(
      {
        error:
          "Enter a reason for the complimentary membership.",
      },
      {
        status: 400,
      },
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "admin_grant_complimentary_membership",
    {
      p_user_id: userId,
      p_plan_slug: plan,
      p_days: Math.floor(days),
      p_reason: reason,
      p_campaign_code:
        campaignCode || null,
    },
  );

  if (error) {
    return Response.json(
      {
        error: error.message,
      },
      {
        status: 400,
      },
    );
  }

  return Response.json({
    success: true,
    grant: data,
  });
}
