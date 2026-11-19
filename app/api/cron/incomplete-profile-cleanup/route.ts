import {
  deleteAfroLoveAccount,
} from "@/lib/account-deletion";
import {
  sendProfileReminderWithResend,
} from "@/lib/resend-profile-reminder";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type IncompleteProfile = {
  id: string;
  email: string | null;
  display_name: string;
  onboarding_completed: boolean;
  account_status: string;
  created_at: string;
  incomplete_cleanup_started_at: string;
  photo_verification_status: string | null;
  id_verification_status: string | null;
};

function integerSetting(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < minimum ||
    parsed > maximum
  ) {
    return fallback;
  }

  return parsed;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function dateLabel(date: Date) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "long",
      timeZone: "UTC",
    },
  ).format(date);
}

function addDays(
  value: Date,
  days: number,
) {
  return new Date(
    value.getTime() +
      days * 24 * 60 * 60 * 1000,
  );
}

async function authoritativeEmail(
  admin: ReturnType<
    typeof createAdminClient
  >,
  userId: string,
) {
  const {
    data,
    error,
  } =
    await admin.auth.admin.getUserById(
      userId,
    );

  if (error) return null;

  const email =
    data.user?.email?.trim();

  return email || null;
}

export async function GET(
  request: Request,
) {
  const secret =
    process.env.CRON_SECRET;

  const authorization =
    request.headers.get(
      "authorization",
    );

  if (
    !secret ||
    authorization !==
      `Bearer ${secret}`
  ) {
    return Response.json(
      {
        error: "Unauthorized.",
      },
      {
        status: 401,
      },
    );
  }

  const deleteAfterDays =
    integerSetting(
      process.env
        .INCOMPLETE_PROFILE_DELETE_AFTER_DAYS,
      30,
      7,
      365,
    );

  const firstWarningDays =
    Math.min(
      integerSetting(
        process.env
          .INCOMPLETE_PROFILE_FIRST_WARNING_DAYS,
        7,
        2,
        30,
      ),
      deleteAfterDays - 1,
    );

  const finalWarningDays =
    Math.min(
      integerSetting(
        process.env
          .INCOMPLETE_PROFILE_FINAL_WARNING_DAYS,
        1,
        1,
        7,
      ),
      Math.max(
        1,
        firstWarningDays - 1,
      ),
    );

  const admin =
    createAdminClient();

  try {
    /*
     * Only ordinary active accounts that
     * still have incomplete onboarding.
     *
     * Warned/restricted/suspended/banned
     * accounts are left for administrators
     * to handle manually.
     */
    const {
      data,
      error,
    } = await admin
      .from("profiles")
      .select(
        "id,email,display_name,onboarding_completed,account_status,created_at,incomplete_cleanup_started_at,photo_verification_status,id_verification_status",
      )
      .eq(
        "onboarding_completed",
        false,
      )
      .eq(
        "account_status",
        "active",
      )
      .order(
        "incomplete_cleanup_started_at",
        {
          ascending: true,
        },
      )
      .limit(250);

    if (error) {
      throw new Error(
        "Unable to load incomplete profiles.",
      );
    }

    const profiles =
      (data || []) as unknown as IncompleteProfile[];

    if (!profiles.length) {
      return Response.json({
        success: true,
        checked: 0,
        warned: 0,
        deleted: 0,
        protectedMemberships: 0,
        protectedStaff: 0,
        underReview: 0,
        failures: [],
        policy: {
          deleteAfterDays,
          firstWarningDays,
          finalWarningDays,
        },
      });
    }

    const ids =
      profiles.map(
        (profile) => profile.id,
      );

    const membershipCheckTime =
      new Date().toISOString();

    const [
      staffResult,
      membershipResult,
      complimentaryResult,
      auditResult,
    ] = await Promise.all([
      admin
        .from("admin_members")
        .select("user_id")
        .in("user_id", ids)
        .eq("is_active", true),

      admin
        .from(
          "member_subscriptions",
        )
        .select("user_id,status")
        .in("user_id", ids)
        .in("status", [
          "pending",
          "trialing",
          "active",
          "past_due",
        ]),

      admin
        .from(
          "complimentary_memberships",
        )
        .select("user_id")
        .in("user_id", ids)
        .is("revoked_at", null)
        .gt(
          "ends_at",
          membershipCheckTime,
        ),

      admin
        .from("admin_audit_logs")
        .select(
          "target_user_id,action,metadata",
        )
        .in("target_user_id", ids)
        .in("action", [
          "incomplete_profile_warning_7d",
          "incomplete_profile_warning_final",
        ]),
    ]);

    if (staffResult.error) {
      throw new Error(
        "Unable to verify staff protection.",
      );
    }

    if (
      membershipResult.error ||
      complimentaryResult.error
    ) {
      throw new Error(
        "Unable to verify membership protection.",
      );
    }

    if (auditResult.error) {
      throw new Error(
        "Unable to inspect cleanup reminder history.",
      );
    }

    const staffIds =
      new Set(
        (staffResult.data || []).map(
          (row) => row.user_id,
        ),
      );

    const protectedMembershipIds =
      new Set([
        ...(membershipResult.data || []).map(
          (row) => row.user_id,
        ),
        ...(complimentaryResult.data || []).map(
          (row) => row.user_id,
        ),
      ]);

    const existingWarnings =
      new Set(
        (auditResult.data || []).flatMap(
          (row) => {
            const metadata =
              row.metadata;

            if (
              !metadata ||
              typeof metadata !== "object" ||
              Array.isArray(metadata)
            ) {
              return [];
            }

            const warningDeadline =
              (
                metadata as Record<
                  string,
                  unknown
                >
              ).deadline;

            if (
              typeof warningDeadline !==
              "string"
            ) {
              return [];
            }

            return [
              `${row.target_user_id}:${row.action}:${warningDeadline}`,
            ];
          },
        ),
      );

    const now = new Date();

    let warned = 0;
    let deleted = 0;
    let protectedMemberships = 0;
    let protectedStaff = 0;
    let underReview = 0;

    /*
     * Deletions are deliberately capped
     * per cron run because the safe deletion
     * routine also removes storage files.
     */
    const maxDeletionsPerRun = 10;

    const failures: Array<{
      userId: string;
      stage: string;
      error: string;
    }> = [];

    const pauseCleanupClock =
      async (
        userId: string,
        protection: string,
      ) => {
        const result =
          await (admin as any)
            .from("profiles")
            .update({
              incomplete_cleanup_started_at:
                now.toISOString(),
            })
            .eq("id", userId)
            .eq(
              "onboarding_completed",
              false,
            );

        if (result.error) {
          failures.push({
            userId,
            stage:
              "pause-cleanup-clock",
            error:
              `Unable to pause cleanup clock for ${protection} protection.`,
          });
        }
      };

    for (const profile of profiles) {
      if (staffIds.has(profile.id)) {
        protectedStaff += 1;

        await pauseCleanupClock(
          profile.id,
          "staff",
        );

        continue;
      }

      if (
        protectedMembershipIds.has(
          profile.id,
        )
      ) {
        /*
         * Important for paid subscribers:
         * no deletion warning and no automatic
         * deletion while a current membership
         * exists.
         */
        protectedMemberships += 1;

        await pauseCleanupClock(
          profile.id,
          "membership",
        );

        continue;
      }

      if (
        profile.photo_verification_status ===
          "reviewing" ||
        profile.id_verification_status ===
          "reviewing"
      ) {
        underReview += 1;

        await pauseCleanupClock(
          profile.id,
          "verification review",
        );

        continue;
      }

      const clockStart =
        new Date(
          profile.incomplete_cleanup_started_at ||
            profile.created_at,
        );

      if (
        Number.isNaN(
          clockStart.getTime(),
        )
      ) {
        failures.push({
          userId: profile.id,
          stage: "deadline",
          error:
            "Invalid cleanup start date.",
        });
        continue;
      }

      const deadline =
        addDays(
          clockStart,
          deleteAfterDays,
        );

      const deadlineIso =
        deadline.toISOString();

      const remainingMs =
        deadline.getTime() -
        now.getTime();

      const remainingDays =
        Math.ceil(
          remainingMs /
            (24 * 60 * 60 * 1000),
        );

      /*
       * DEADLINE REACHED
       */
      if (
        remainingMs <= 0 &&
        deleted <
          maxDeletionsPerRun
      ) {
        try {
          /*
           * Race-condition protection:
           * check again immediately before
           * permanent deletion.
           */
          const {
            data: fresh,
            error: freshError,
          } = await admin
            .from("profiles")
            .select(
              "id,onboarding_completed,account_status",
            )
            .eq("id", profile.id)
            .maybeSingle();

          if (
            freshError ||
            !fresh ||
            fresh.onboarding_completed ||
            fresh.account_status !==
              "active"
          ) {
            continue;
          }

          const email =
            await authoritativeEmail(
              admin,
              profile.id,
            );

          await deleteAfroLoveAccount({
            userId: profile.id,
            actor: {
              kind: "system",
            },
            reason:
              `Automatic cleanup: profile remained incomplete for ${deleteAfterDays} days after the incomplete-profile grace period started.`,
          });

          deleted += 1;

          /*
           * Send confirmation after successful
           * account deletion. Failure to deliver
           * the email does not undo deletion.
           */
          if (email) {
            try {
              const name =
                profile.display_name.trim() ||
                "AfroLove member";

              await sendProfileReminderWithResend({
                to: email,
                subject:
                  "Your incomplete AfroLove account has been deleted",
                text: [
                  `Dear ${name},`,
                  "",
                  `Your AfroLove account was automatically deleted because the profile was not completed within the ${deleteAfterDays}-day completion period.`,
                  "",
                  "No active paid membership was attached to the account at the time of deletion.",
                  "",
                  "If you would like to use AfroLove in the future, you may create a new account and complete the profile setup.",
                  "",
                  "Kind regards,",
                  "AfroLove Support",
                  "One Africa. Real Connections.",
                  "www.afroloveapp.com",
                ].join("\n"),
                html: `
                  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#171717;max-width:620px;margin:auto">
                    <h2>AfroLove account update</h2>
                    <p>Dear ${escapeHtml(name)},</p>
                    <p>Your AfroLove account was automatically deleted because the profile was not completed within the <strong>${deleteAfterDays}-day completion period</strong>.</p>
                    <p>No active paid membership was attached to the account at the time of deletion.</p>
                    <p>If you would like to use AfroLove in the future, you may create a new account and complete the profile setup.</p>
                    <p>Kind regards,<br><strong>AfroLove Support</strong><br>One Africa. Real Connections.<br>www.afroloveapp.com</p>
                  </div>
                `,
                idempotencyKey:
                  `incomplete-profile-deleted/${profile.id}/${deadline.toISOString().slice(0, 10)}`,
              });
            } catch (emailError) {
              failures.push({
                userId:
                  profile.id,
                stage:
                  "deletion-email",
                error:
                  emailError instanceof
                  Error
                    ? emailError.message
                    : "Deletion email failed.",
              });
            }
          }
        } catch (caught) {
          failures.push({
            userId: profile.id,
            stage: "deletion",
            error:
              caught instanceof Error
                ? caught.message
                : "Automatic deletion failed.",
          });
        }

        continue;
      }

      /*
       * FINAL WARNING
       */
      if (
        remainingDays <=
          finalWarningDays &&
        remainingDays > 0
      ) {
        const action =
          "incomplete_profile_warning_final";

        const warningKey =
          `${profile.id}:${action}:${deadlineIso}`;

        if (
          existingWarnings.has(
            warningKey,
          )
        ) {
          continue;
        }

        try {
          const email =
            await authoritativeEmail(
              admin,
              profile.id,
            );

          if (!email) continue;

          const name =
            profile.display_name.trim() ||
            "AfroLove member";

          const deadlineText =
            dateLabel(deadline);

          const onboardingUrl =
            new URL(
              "/onboarding",
              request.url,
            ).toString();

          const result =
            await sendProfileReminderWithResend({
              to: email,
              subject:
                "Final reminder: complete your AfroLove profile",
              text: [
                `Dear ${name},`,
                "",
                "Your AfroLove profile is still incomplete.",
                "",
                `Please complete your profile by ${deadlineText}. If it remains incomplete after this deadline, the account and incomplete profile are scheduled for permanent deletion.`,
                "",
                `Complete your profile: ${onboardingUrl}`,
                "",
                "If you have already completed your profile, no further action is required.",
                "",
                "Kind regards,",
                "AfroLove Support",
                "One Africa. Real Connections.",
              ].join("\n"),
              html: `
                <div style="font-family:Arial,sans-serif;line-height:1.6;color:#171717;max-width:620px;margin:auto">
                  <h2>Final profile completion reminder</h2>
                  <p>Dear ${escapeHtml(name)},</p>
                  <p>Your AfroLove profile is still incomplete.</p>
                  <p>Please complete your profile by <strong>${escapeHtml(deadlineText)}</strong>. If it remains incomplete after this deadline, the account and incomplete profile are scheduled for permanent deletion.</p>
                  <p><a href="${onboardingUrl}">Complete your AfroLove profile</a></p>
                  <p>If you have already completed your profile, no further action is required.</p>
                  <p>Kind regards,<br><strong>AfroLove Support</strong><br>One Africa. Real Connections.</p>
                </div>
              `,
              idempotencyKey:
                `incomplete-profile-final/${profile.id}/${deadline.getTime()}`,
            });

          const audit =
            await admin
              .from(
                "admin_audit_logs",
              )
              .insert({
                admin_id: null,
                action,
                target_user_id:
                  profile.id,
                metadata: {
                  automated: true,
                  providerMessageId:
                    result.id,
                  deleteAfterDays,
                  daysRemaining:
                    remainingDays,
                  deadline:
                    deadlineIso,
                },
              });

          if (audit.error) {
            throw new Error(
              "Warning was sent but its audit record could not be saved.",
            );
          }

          existingWarnings.add(
            warningKey,
          );

          warned += 1;
        } catch (caught) {
          failures.push({
            userId: profile.id,
            stage:
              "final-warning",
            error:
              caught instanceof Error
                ? caught.message
                : "Final warning failed.",
          });
        }

        continue;
      }

      /*
       * FIRST WARNING
       */
      if (
        remainingDays <=
          firstWarningDays &&
        remainingDays >
          finalWarningDays
      ) {
        const action =
          "incomplete_profile_warning_7d";

        const warningKey =
          `${profile.id}:${action}:${deadlineIso}`;

        if (
          existingWarnings.has(
            warningKey,
          )
        ) {
          continue;
        }

        try {
          const email =
            await authoritativeEmail(
              admin,
              profile.id,
            );

          if (!email) continue;

          const name =
            profile.display_name.trim() ||
            "AfroLove member";

          const deadlineText =
            dateLabel(deadline);

          const onboardingUrl =
            new URL(
              "/onboarding",
              request.url,
            ).toString();

          const result =
            await sendProfileReminderWithResend({
              to: email,
              subject:
                "Please complete your AfroLove profile",
              text: [
                `Dear ${name},`,
                "",
                "Your AfroLove profile is still incomplete.",
                "",
                `You have approximately ${remainingDays} days remaining to complete your profile. The current completion deadline is ${deadlineText}.`,
                "",
                "Incomplete accounts that remain unfinished after the completion period may be permanently deleted.",
                "",
                `Complete your profile: ${onboardingUrl}`,
                "",
                "Kind regards,",
                "AfroLove Support",
                "One Africa. Real Connections.",
              ].join("\n"),
              html: `
                <div style="font-family:Arial,sans-serif;line-height:1.6;color:#171717;max-width:620px;margin:auto">
                  <h2>Complete your AfroLove profile</h2>
                  <p>Dear ${escapeHtml(name)},</p>
                  <p>Your AfroLove profile is still incomplete.</p>
                  <p>You have approximately <strong>${remainingDays} days</strong> remaining. Your current profile completion deadline is <strong>${escapeHtml(deadlineText)}</strong>.</p>
                  <p>Incomplete accounts that remain unfinished after the completion period may be permanently deleted.</p>
                  <p><a href="${onboardingUrl}">Complete your AfroLove profile</a></p>
                  <p>Kind regards,<br><strong>AfroLove Support</strong><br>One Africa. Real Connections.</p>
                </div>
              `,
              idempotencyKey:
                `incomplete-profile-warning/${profile.id}/${deadline.getTime()}`,
            });

          const audit =
            await admin
              .from(
                "admin_audit_logs",
              )
              .insert({
                admin_id: null,
                action,
                target_user_id:
                  profile.id,
                metadata: {
                  automated: true,
                  providerMessageId:
                    result.id,
                  deleteAfterDays,
                  daysRemaining:
                    remainingDays,
                  deadline:
                    deadlineIso,
                },
              });

          if (audit.error) {
            throw new Error(
              "Warning was sent but its audit record could not be saved.",
            );
          }

          existingWarnings.add(
            warningKey,
          );

          warned += 1;
        } catch (caught) {
          failures.push({
            userId: profile.id,
            stage:
              "first-warning",
            error:
              caught instanceof Error
                ? caught.message
                : "Profile warning failed.",
          });
        }
      }
    }

    return Response.json({
      success: true,
      checked: profiles.length,
      warned,
      deleted,
      protectedMemberships,
      protectedStaff,
      underReview,
      failures,
      policy: {
        deleteAfterDays,
        firstWarningDays,
        finalWarningDays,
        maxDeletionsPerRun,
      },
    });
  } catch (caught) {
    console.error(
      "AfroLove incomplete profile cleanup failed:",
      caught,
    );

    return Response.json(
      {
        error:
          caught instanceof Error
            ? caught.message
            : "Incomplete profile cleanup failed.",
      },
      {
        status: 500,
      },
    );
  }
}
