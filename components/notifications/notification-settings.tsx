"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Preferences = {
  likes_enabled: boolean;
  matches_enabled: boolean;
  messages_enabled: boolean;
  safety_enabled: boolean;
  verification_enabled: boolean;
  marketing_enabled: boolean;
};

const defaultPreferences: Preferences = {
  likes_enabled: true,
  matches_enabled: true,
  messages_enabled: true,
  safety_enabled: true,
  verification_enabled: true,
  marketing_enabled: false,
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}

export function NotificationSettings() {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const pushSupported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(pushSupported);
    if (pushSupported) setPermission(Notification.permission);

    void Promise.all([
      fetch("/api/notifications/preferences")
        .then((response) => response.json())
        .then((payload) => {
          if (payload.preferences) setPreferences(payload.preferences);
        }),
      pushSupported
        ? navigator.serviceWorker.ready.then((registration) =>
            registration.pushManager.getSubscription().then((subscription) =>
              setSubscribed(Boolean(subscription)),
            ),
          )
        : Promise.resolve(),
    ]).finally(() => setLoading(false));
  }, []);

  const savePreferences = async (next: Preferences) => {
    setPreferences(next);
    const response = await fetch("/api/notifications/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!response.ok) setMessage("Unable to save notification preferences.");
  };

  const toggle = (key: keyof Preferences) => {
    void savePreferences({ ...preferences, [key]: !preferences[key] });
  };

  const subscribe = async () => {
    setBusy(true);
    setMessage("");
    try {
      if (!supported) throw new Error("Push notifications are not supported in this browser.");
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Push notifications are not configured yet.");

      await Notification.requestPermission();

      const effectivePermission = Notification.permission;
      setPermission(effectivePermission);

      if (effectivePermission !== "granted") {
        throw new Error(
          effectivePermission === "denied"
            ? "Notifications are blocked in this browser."
            : window.location.hostname === "localhost"
              ? "Edge did not persist notification permission for localhost. Test notifications on the live HTTPS website or in Chrome."
              : "Notification permission was not granted.",
        );
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const serialized = subscription.toJSON();
      const response = await fetch("/api/push/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: serialized.endpoint,
          keys: serialized.keys,
          userAgent: navigator.userAgent,
        }),
      });
      if (!response.ok) throw new Error("Unable to save this device subscription.");

      setSubscribed(true);
      setMessage("Notifications are enabled on this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to enable notifications.");
    } finally {
      setBusy(false);
    }
  };

  const unsubscribe = async () => {
    setBusy(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const endpoint = subscription?.endpoint || "";
      await subscription?.unsubscribe();
      await fetch("/api/push/subscription", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
      setSubscribed(false);
      setMessage("Notifications are disabled on this device.");
    } finally {
      setBusy(false);
    }
  };

  const testNotification = async () => {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/push/test", { method: "POST" });
    const payload = await response.json().catch(() => ({}));
    setMessage(
      response.ok
        ? payload.delivered > 0
          ? "Test notification sent."
          : "Notification saved, but no active device subscription received it."
        : payload.error || "Unable to send the test notification.",
    );
    setBusy(false);
  };

  const rows: { key: keyof Preferences; title: string; text: string }[] = [
    { key: "likes_enabled", title: "New Likes", text: "Someone shows interest in your profile." },
    { key: "matches_enabled", title: "New Matches", text: "You and another member choose each other." },
    { key: "messages_enabled", title: "New Messages", text: "A match sends you a conversation message." },
    { key: "safety_enabled", title: "Safety Updates", text: "Important report and account-protection outcomes." },
    { key: "verification_enabled", title: "Verification Updates", text: "Your verification request changes status." },
    { key: "marketing_enabled", title: "AfroLove News", text: "Optional product updates and offers." },
  ];

  return (
    <main className="min-h-screen px-4 py-6">
      <section className="mx-auto max-w-2xl overflow-hidden rounded-[32px] border border-white/10 bg-[#0d0f14] shadow-2xl">
        <header className="border-b border-white/10 px-5 py-6 sm:px-8">
          <Link href="/app?tab=profile" className="text-xs font-bold text-[#F2C94C]">← Back to AfroLove</Link>
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.25em] text-[#F2C94C]">Device & activity</p>
          <h1 className="mt-2 text-3xl font-black">Notification settings</h1>
          <p className="mt-2 text-sm leading-6 text-white/45">Control which AfroLove updates appear on this device.</p>
        </header>

        <div className="p-5 sm:p-8">
          <div className="rounded-3xl border border-[#F2C94C]/20 bg-[#F2C94C]/[0.06] p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-black">Browser push notifications</p>
                <p className="mt-1 text-xs text-white/40">
                  {loading
                    ? "Checking this device..."
                    : !supported
                      ? "Not supported by this browser."
                      : subscribed
                        ? "Enabled on this device."
                        : `Permission: ${permission}.`}
                </p>
              </div>
              <button
                type="button"
                disabled={busy || loading || !supported}
                onClick={() => void (subscribed ? unsubscribe() : subscribe())}
                className="rounded-2xl bg-[#F2C94C] px-5 py-3 text-xs font-black text-black disabled:opacity-50"
              >
                {busy ? "Please wait..." : subscribed ? "Disable" : "Enable"}
              </button>
            </div>
            {subscribed && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void testNotification()}
                className="mt-4 w-full rounded-2xl border border-white/10 py-3 text-xs font-black text-white/60"
              >
                Send a test notification
              </button>
            )}
            {message && <p className="mt-4 text-xs leading-5 text-[#FFE58C]">{message}</p>}
          </div>

          <div className="mt-6 space-y-2">
            {rows.map((row) => (
              <button
                key={row.key}
                type="button"
                onClick={() => toggle(row.key)}
                className="flex w-full items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black">{row.title}</span>
                  <span className="mt-1 block text-[11px] leading-4 text-white/35">{row.text}</span>
                </span>
                <span className={`relative h-6 w-11 rounded-full transition ${preferences[row.key] ? "bg-[#F2C94C]" : "bg-white/10"}`}>
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${preferences[row.key] ? "left-6" : "left-1"}`} />
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-xs leading-5 text-white/38">
            iPhone and iPad push notifications require AfroLove to be added to the Home Screen first. Device notification permissions can also be changed in your operating-system settings.
          </div>
        </div>
      </section>
    </main>
  );
}
