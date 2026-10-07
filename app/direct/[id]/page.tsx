"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

type DirectProfile = {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  photos?: string[] | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  is_online?: boolean | null;
};

type DirectMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  messageType: "text" | "image" | "voice";
  mediaUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

type DirectPayload = {
  conversation: {
    id: string;
    initiatedBy: string;
    profile: DirectProfile | null;
  };
  messages: DirectMessage[];
};

async function requestJson<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : "Something went wrong.",
    );
  }

  return payload as T;
}

export default function DirectConversationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const conversationId = params.id;

  const [data, setData] = useState<DirectPayload | null>(null);
  const [memberId, setMemberId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const loadConversation = async () => {
    try {
      const [conversation, account] = await Promise.all([
        requestJson<DirectPayload>(
          `/api/vip-direct/${conversationId}/messages`,
          { cache: "no-store" },
        ),
        fetch("/api/account", { cache: "no-store" })
          .then((response) => response.json())
          .catch(() => null),
      ]);

      setData(conversation);

      const possibleId =
        account?.profile?.id ||
        account?.user?.id ||
        account?.id ||
        "";

      if (typeof possibleId === "string") {
        setMemberId(possibleId);
      }

      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load this conversation.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConversation();
  }, [conversationId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();

    const body = message.trim();
    if (!body || sending) return;

    setSending(true);

    try {
      const result = await requestJson<{ message: DirectMessage }>(
        `/api/vip-direct/${conversationId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ body }),
        },
      );

      setData((current) =>
        current
          ? {
              ...current,
              messages: [...current.messages, result.message],
            }
          : current,
      );

      setMessage("");
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to send your message.",
      );
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0d0f14] text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-[#F2C94C]" />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0d0f14] px-6 text-center text-white">
        <div>
          <p className="text-lg font-black">Conversation unavailable</p>
          <p className="mt-2 text-sm text-white/40">{error}</p>
          <button
            onClick={() => router.push("/app?tab=chat")}
            className="mt-6 rounded-2xl bg-[#F2C94C] px-5 py-3 text-sm font-black text-black"
          >
            Back to Messages
          </button>
        </div>
      </main>
    );
  }

  const profile = data.conversation.profile;
  const displayName = profile?.display_name || "AfroLove member";

  const photo =
    profile?.photos?.[0] ||
    profile?.avatar_url ||
    null;

  return (
    <main className="min-h-screen bg-[#0d0f14] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[680px] flex-col border-x border-white/[0.05] bg-[#0d0f14]">
        <header className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
          <button
            type="button"
            onClick={() => router.push("/app?tab=chat")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.045] text-xl text-white/65"
            aria-label="Back to messages"
          >
            ‹
          </button>

          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#1a1d24]">
            {photo ? (
              <Image
                src={photo}
                alt={displayName}
                fill
                sizes="44px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-black text-[#FFE58C]">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black">
              {displayName}
            </p>
            <p className="mt-0.5 text-[10px] text-[#FFE58C]/65">
              VIP direct conversation
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="mx-auto mb-6 max-w-[290px] text-center">
            <div className="mx-auto flex h-9 w-max items-center rounded-full border border-[#F2C94C]/20 bg-[#F2C94C]/[0.06] px-4 text-[10px] font-black text-[#FFE58C]">
              VIP DIRECT MESSAGE
            </div>

            <p className="mt-3 text-xs leading-5 text-white/38">
              This conversation was started through VIP messaging.
              It does not mean you are mutually matched.
            </p>
          </div>

          <div className="space-y-3">
            {data.messages.map((item) => {
              const mine = item.senderId === memberId;

              return (
                <div
                  key={item.id}
                  className={`flex ${
                    mine ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[82%] rounded-[20px] px-4 py-2.5 ${
                      mine
                        ? "rounded-br-md bg-[#F2C94C] text-black"
                        : "rounded-bl-md bg-white/[0.07] text-white"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-5">
                      {item.body}
                    </p>
                  </div>
                </div>
              );
            })}

            {!data.messages.length && (
              <p className="py-10 text-center text-xs text-white/30">
                Start the conversation with a thoughtful hello.
              </p>
            )}

            <div ref={endRef} />
          </div>
        </div>

        <form
          onSubmit={sendMessage}
          className="border-t border-white/[0.07] bg-[#0d0f14]/95 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3"
        >
          {error && (
            <p className="mb-2 text-center text-[10px] font-bold text-red-300">
              {error}
            </p>
          )}

          <div className="flex items-end gap-2">
            <textarea
              rows={1}
              maxLength={2000}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write a message..."
              className="max-h-28 min-h-11 flex-1 resize-none rounded-[20px] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm outline-none focus:border-[#F2C94C]/40"
            />

            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F2C94C] text-lg font-black text-black disabled:opacity-35"
              aria-label="Send message"
            >
              {sending ? "…" : "➤"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
