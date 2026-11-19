import { Resend } from "resend";
import { isAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function text(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

async function findAuthUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
) {
  const wanted = email.trim().toLowerCase();

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } =
      await admin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });

    if (error) throw error;

    const match = data.users.find(
      (item) =>
        item.email?.trim().toLowerCase() ===
        wanted,
    );

    if (match) return match;

    if (data.users.length < 1000) break;
  }

  return null;
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();

  if (!adminUser) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  if (!(await isAdmin(supabase))) {
    return Response.json(
      { error: "Admin access required." },
      { status: 403 },
    );
  }

  const payload =
    await request.json().catch(() => ({}));

  const subscriptionId =
    text(payload.subscriptionId);

  if (!subscriptionId) {
    return Response.json(
      { error: "PayPal subscription ID is required." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  try {
    const {
      data: membership,
      error: membershipError,
    } = await admin
      .from("member_subscriptions")
      .select(
        "id,user_id,plan_slug,status,provider,provider_subscription_id,customer_email,current_period_start,current_period_end,metadata",
      )
      .eq("provider", "paypal")
      .eq(
        "provider_subscription_id",
        subscriptionId,
      )
      .maybeSingle();

    if (membershipError) {
      throw membershipError;
    }

    if (!membership) {
      return Response.json(
        {
          error:
            "The PayPal membership could not be found.",
        },
        { status: 404 },
      );
    }

    if (membership.user_id) {
      return Response.json(
        {
          error:
            "This PayPal subscription is already connected to an AfroLove account.",
        },
        { status: 409 },
      );
    }

    if (
      !["active", "trialing", "past_due"].includes(
        membership.status,
      )
    ) {
      return Response.json(
        {
          error:
            "Only a current PayPal membership can be recovered.",
        },
        { status: 409 },
      );
    }

    const email =
      text(membership.customer_email);

    if (!email) {
      return Response.json(
        {
          error:
            "The PayPal subscription does not contain a customer email address.",
        },
        { status: 400 },
      );
    }

    const metadata =
      membership.metadata &&
      typeof membership.metadata === "object" &&
      !Array.isArray(membership.metadata)
        ? membership.metadata as Record<
            string,
            unknown
          >
        : {};

    const payerName =
      text(metadata.payer_name) ||
      text(metadata.subscriber_name) ||
      "AfroLove member";

    let authUser =
      await findAuthUserByEmail(
        admin,
        email,
      );

    let createdAuthUser = false;

    if (!authUser) {
      const {
        data: created,
        error: createError,
      } =
        await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            display_name: payerName,
            afrolove_account_recovery: true,
          },
        });

      if (createError || !created.user) {
        throw new Error(
          createError?.message ||
            "Unable to create the recovery account.",
        );
      }

      authUser = created.user;
      createdAuthUser = true;
    }

    const {
      data: existingMembership,
      error: existingMembershipError,
    } = await admin
      .from("member_subscriptions")
      .select("id,provider_subscription_id")
      .eq("user_id", authUser.id)
      .in("status", [
        "pending",
        "trialing",
        "active",
        "past_due",
      ])
      .neq("id", membership.id)
      .limit(1)
      .maybeSingle();

    if (existingMembershipError) {
      throw existingMembershipError;
    }

    if (existingMembership) {
      return Response.json(
        {
          error:
            "An active membership already exists for this email address. No changes were made.",
        },
        { status: 409 },
      );
    }

    const {
      data: currentProfile,
      error: profileLookupError,
    } = await admin
      .from("profiles")
      .select("id")
      .eq("id", authUser.id)
      .maybeSingle();

    if (profileLookupError) {
      throw profileLookupError;
    }

    if (!currentProfile) {
      const { error: profileInsertError } =
        await admin
          .from("profiles")
          .insert({
            id: authUser.id,
            email,
            display_name: payerName,
            avatar_url: null,
            onboarding_completed: false,
            account_status: "active",
          });

      if (profileInsertError) {
        throw profileInsertError;
      }
    }

    const {
      data: recoveryLink,
      error: recoveryLinkError,
    } =
      await admin.auth.admin.generateLink({
        type: "recovery",
        email,
      });

    if (
      recoveryLinkError ||
      !recoveryLink.properties?.hashed_token
    ) {
      throw new Error(
        recoveryLinkError?.message ||
          "Unable to create the secure recovery link.",
      );
    }

    const origin =
      new URL(request.url).origin;

    const recoveryUrl =
      `${origin}/auth/confirm` +
      `?token_hash=${encodeURIComponent(
        recoveryLink.properties.hashed_token,
      )}` +
      `&type=recovery` +
      `&next=${encodeURIComponent(
        "/reset-password",
      )}`;

    const apiKey =
      process.env.RESEND_API_KEY;

    const from =
      process.env.RESEND_FROM_EMAIL ||
      "AfroLove Support <support@afroloveapp.com>";

    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY is not configured.",
      );
    }

    const resend = new Resend(apiKey);

    const {
      data: emailResult,
      error: emailError,
    } = await resend.emails.send({
      from,
      to: [email],
      subject:
        "Restore Your AfroLove Premium Account",
      text: [
        `Dear ${payerName},`,
        "",
        "We identified an unexpected technical issue affecting access to your AfroLove account after your recent Premium payment.",
        "",
        "Please be assured that your payment was received successfully and your Premium subscription remains valid. You do not need to make another payment or purchase another subscription.",
        "",
        "We have prepared a secure account-recovery link for you. Please use the link below to choose a new password and restore access:",
        "",
        recoveryUrl,
        "",
        "Some profile information or photos that were removed during the account issue may need to be confirmed or uploaded again, but your existing Premium payment and subscription will remain connected to your restored account.",
        "",
        "If you did not expect this email or need assistance, simply reply to this message.",
        "",
        "Kind regards,",
        "AfroLove Support",
        "One Africa. Real Connections.",
        "www.afroloveapp.com",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#171717;max-width:620px;margin:auto">
          <h2 style="color:#6b1839">AfroLove Premium Account Recovery</h2>

          <p>Dear ${payerName},</p>

          <p>
            We identified an unexpected technical issue affecting access to your AfroLove account after your recent Premium payment.
          </p>

          <p>
            <strong>Your payment was received successfully and your Premium subscription remains valid.</strong>
            You do not need to make another payment or purchase another subscription.
          </p>

          <p>
            We have prepared a secure recovery link for you:
          </p>

          <p style="margin:28px 0">
            <a
              href="${recoveryUrl}"
              style="display:inline-block;background:#F2C94C;color:#111;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:10px"
            >
              Restore My AfroLove Account
            </a>
          </p>

          <p>
            The link will allow you to choose a new password and restore access to AfroLove.
          </p>

          <p>
            Some profile information or photos that were removed during the account issue may need to be confirmed or uploaded again, but your existing Premium payment and subscription will remain connected to your restored account.
          </p>

          <p>
            If you need any assistance, simply reply to this email.
          </p>

          <p>
            Kind regards,<br />
            <strong>AfroLove Support</strong><br />
            One Africa. Real Connections.<br />
            www.afroloveapp.com
          </p>
        </div>
      `,
    });

    if (emailError || !emailResult?.id) {
      throw new Error(
        emailError?.message ||
          "The recovery email could not be sent.",
      );
    }

    /*
     * The email has been accepted successfully.
     * Now reconnect the existing PayPal membership
     * and historical payment to this recovered user.
     */
    const {
      error: membershipUpdateError,
    } = await admin
      .from("member_subscriptions")
      .update({
        user_id: authUser.id,
        metadata: {
          ...metadata,
          payer_name: payerName,
          payer_email: email,
          account_recovery_started: true,
          recovered_auth_user_id:
            authUser.id,
          recovery_email_id:
            emailResult.id,
          recovery_requested_at:
            new Date().toISOString(),
        },
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", membership.id);

    if (membershipUpdateError) {
      throw membershipUpdateError;
    }

    const {
      error: transactionUpdateError,
    } = await admin
      .from("payment_transactions")
      .update({
        user_id: authUser.id,
        subscription_id: membership.id,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "provider_transaction_id",
        "paypal:6PS37125WY308160L",
      );

    if (transactionUpdateError) {
      throw transactionUpdateError;
    }

    await admin
      .from("admin_audit_logs")
      .insert({
        admin_id: adminUser.id,
        action:
          "paypal_account_recovery_sent",
        target_user_id: authUser.id,
        metadata: {
          paypalSubscriptionId:
            subscriptionId,
          customerEmail: email,
          customerName: payerName,
          createdAuthUser,
          recoveryEmailId:
            emailResult.id,
        },
      });

    return Response.json({
      success: true,
      email,
      displayName: payerName,
      authUserId: authUser.id,
      createdAuthUser,
      message:
        "Recovery account created, Premium membership reconnected, and recovery email sent successfully.",
    });
  } catch (error) {
    console.error(
      "AfroLove PayPal recovery failed:",
      error,
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to restore the account.",
      },
      { status: 500 },
    );
  }
}
