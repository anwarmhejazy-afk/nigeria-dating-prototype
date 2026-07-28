import {
  cleanupExpiredVerificationEvidence,
} from "@/lib/account-deletion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization =
    request.headers.get("authorization");

  if (
    !secret ||
    authorization !== `Bearer ${secret}`
  ) {
    return Response.json(
      {
        error: "Unauthorized.",
      },
      { status: 401 },
    );
  }

  try {
    const result =
      await cleanupExpiredVerificationEvidence(
        100,
      );

    return Response.json({
      success: true,
      ...result,
    });
  } catch (caught) {
    console.error(
      "AfroLove verification-retention cleanup failed:",
      caught,
    );

    return Response.json(
      {
        error:
          "Verification evidence cleanup failed.",
      },
      { status: 500 },
    );
  }
}
