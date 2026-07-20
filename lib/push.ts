import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

type PushPayload = {
  type: "like" | "match" | "message" | "safety" | "verification" | "system";
  title: string;
  body: string;
  url?: string;
  tag?: string;
  metadata?: Record<string, unknown>;
};

type DeliverySubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function configured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.PUSH_DELIVERY_SECRET,
  );
}

function configureWebPush() {
  if (!configured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:anwar_hejazy@hotmail.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  return true;
}

export async function sendPushToUser(
  supabase: SupabaseClient,
  recipientId: string,
  payload: PushPayload,
) {
  const deliverySecret = process.env.PUSH_DELIVERY_SECRET;
  if (!deliverySecret) return { stored: false, delivered: 0 };

  const { data: notificationId, error: notificationError } = await supabase.rpc(
    "create_notification_for_delivery",
    {
      p_recipient_id: recipientId,
      p_type: payload.type,
      p_title: payload.title,
      p_body: payload.body,
      p_url: payload.url || "/app",
      p_metadata: payload.metadata || {},
      p_delivery_secret: deliverySecret,
    },
  );

  if (notificationError || !notificationId) {
    return { stored: false, delivered: 0 };
  }

  if (!configureWebPush()) {
    return { stored: true, delivered: 0 };
  }

  const { data, error } = await supabase.rpc(
    "get_push_subscriptions_for_delivery",
    {
      p_recipient_id: recipientId,
      p_delivery_secret: deliverySecret,
    },
  );

  if (error || !Array.isArray(data)) {
    return { stored: true, delivered: 0 };
  }

  let delivered = 0;
  await Promise.all(
    (data as DeliverySubscription[]).map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify({
            ...payload,
            icon: "/icons/icon-192.png",
            badge: "/icons/badge-96.png",
            notificationId,
          }),
        );
        delivered += 1;
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number((error as { statusCode?: unknown }).statusCode)
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.rpc("disable_push_subscription_for_delivery", {
            p_endpoint: subscription.endpoint,
            p_delivery_secret: deliverySecret,
          });
        }
      }
    }),
  );

  return { stored: true, delivered };
}

export async function sendPushToAdmins(
  supabase: SupabaseClient,
  payload: PushPayload,
) {
  const deliverySecret = process.env.PUSH_DELIVERY_SECRET;
  if (!deliverySecret) return;

  const { data } = await supabase.rpc("get_admin_ids_for_delivery", {
    p_delivery_secret: deliverySecret,
  });

  if (!Array.isArray(data)) return;

  await Promise.all(
    (data as { user_id: string }[]).map((admin) =>
      sendPushToUser(supabase, admin.user_id, payload),
    ),
  );
}
