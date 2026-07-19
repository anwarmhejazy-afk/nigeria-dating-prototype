"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { DatingIcon, type DatingIconName } from "@/components/dating/icons";
import { createClient } from "@/lib/supabase/client";
import type {
  DiscoveryProfile,
  InteractionAction,
  MatchMessage,
  MatchSummary,
  MatchingInitialData,
} from "@/lib/matching";
import {
  calculateAge,
  initialsFromName,
  type MemberProfile,
} from "@/lib/profile";

type MainTab = "home" | "discover" | "likes" | "chat" | "profile";

type Overlay =
  | { type: "details"; profile: DiscoveryProfile }
  | { type: "match"; profile: DiscoveryProfile; match: MatchSummary }
  | { type: "premium" }
  | { type: "notifications" }
  | { type: "settings" }
  | { type: "safety"; profile: DiscoveryProfile; matchId?: string }
  | null;

type SwipeHistory = {
  profile: DiscoveryProfile;
  action: InteractionAction;
  matchId?: string;
};

type ApiError = { error?: string };

type SafetyReportDraft = {
  category: string;
  details: string;
  evidenceScope: "profile" | "selected" | "last_20" | "full_conversation";
  selectedMessageIds: string[];
  blockMember: boolean;
  unmatch: boolean;
};

const navItems: { id: MainTab; label: string; icon: DatingIconName }[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "discover", label: "Discover", icon: "discover" },
  { id: "likes", label: "Likes", icon: "heart" },
  { id: "chat", label: "Chat", icon: "chat" },
  { id: "profile", label: "Profile", icon: "user" },
];

const reportOptions = [
  { value: "harassment", label: "Harassment or rude language" },
  { value: "racism_hate_speech", label: "Racism or hate speech" },
  { value: "threats", label: "Threats or intimidation" },
  { value: "sexual_harassment", label: "Sexual harassment" },
  { value: "scam_fraud", label: "Scam or fraud" },
  { value: "asking_for_money", label: "Asking for money" },
  { value: "business_solicitation", label: "Unwanted business transaction" },
  { value: "spam", label: "Spam or advertising" },
  { value: "fake_profile", label: "Fake or misleading identity" },
  { value: "illegal_content", label: "Illegal content" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "underage", label: "May be under 18" },
  { value: "other", label: "Other safety concern" },
];

async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T & ApiError;

  if (!response.ok) {
    throw new Error(payload.error || "Something went wrong. Please try again.");
  }

  return payload;
}

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "now";

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    new Date(value),
  );
}

function profileTitle(profile: DiscoveryProfile) {
  return `${profile.displayName}${profile.age ? `, ${profile.age}` : ""}`;
}

function memberToDiscovery(member: MemberProfile): DiscoveryProfile {
  const photos = Array.from(
    new Set(
      [...member.photo_urls, member.avatar_url]
        .filter((value): value is string => Boolean(value))
        .slice(0, 4),
    ),
  );

  return {
    id: member.id,
    source: "member",
    displayName: member.display_name,
    age: calculateAge(member.date_of_birth),
    city: member.city || member.country || "Africa",
    state: member.state || "",
    country: member.country,
    tribe: member.tribe || "African heritage",
    occupation: member.occupation || "Member",
    education: member.education || "Not specified",
    religion: member.religion || "Not specified",
    height: member.height_cm ? `${member.height_cm} cm` : "Not specified",
    languages: member.languages,
    interests: member.interests,
    bio: member.bio || "Ready to make a genuine connection.",
    lookingFor: member.looking_for || "A genuine connection",
    relationshipGoal: member.relationship_goal || "Dating with intention",
    lifestyle: [
      member.lifestyle.exercise,
      member.lifestyle.drinking,
      member.lifestyle.smoking,
    ]
      .filter((value) => value && value !== "Prefer not to say")
      .join(" · "),
    photos,
    avatarUrl: member.avatar_url || photos[0] || null,
    verified: member.is_verified,
    online: true,
    joinedLabel: "Your profile",
    proximityLabel: [member.city, member.country].filter(Boolean).join(", ") || "Africa",
    compatibility: member.profile_completion,
  };
}

function ProfilePhoto({
  profile,
  className = "",
  priority = false,
  sizes = "430px",
}: {
  profile: DiscoveryProfile;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const source = profile.photos[0] || profile.avatarUrl;

  if (!source) {
    return (
      <div
        className={`flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#806821,#1a1d24_58%,#0d0f14)] text-5xl font-black text-[#FFE58C] ${className}`}
      >
        {initialsFromName(profile.displayName)}
      </div>
    );
  }

  return (
    <Image
      src={source}
      alt={`${profile.displayName}'s profile`}
      fill
      priority={priority}
      sizes={sizes}
      className={`object-cover ${className}`}
    />
  );
}

function SmallAvatar({
  profile,
  size = "h-12 w-12",
}: {
  profile: DiscoveryProfile;
  size?: string;
}) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-full bg-[#1a1d24] ${size}`}>
      <ProfilePhoto profile={profile} sizes="96px" />
      {profile.online && (
        <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-[#111318] bg-emerald-400" />
      )}
    </div>
  );
}

export function DatingApp({
  memberProfile,
  initialData,
}: {
  memberProfile: MemberProfile;
  initialData: MatchingInitialData;
}) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const [tab, setTab] = useState<MainTab>("home");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [candidates, setCandidates] = useState(initialData.candidates);
  const [matches, setMatches] = useState(initialData.matches);
  const [incomingLikes, setIncomingLikes] = useState(initialData.incomingLikes);
  const [activeMatch, setActiveMatch] = useState<MatchSummary | null>(null);
  const [messages, setMessages] = useState<MatchMessage[]>([]);
  const [message, setMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [history, setHistory] = useState<SwipeHistory[]>([]);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [busyProfileId, setBusyProfileId] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    notifications: true,
    showOnline: true,
    discoveryVisible: true,
  });

  const current = candidates[0] || null;
  const next = candidates[1] || null;
  const third = candidates[2] || null;
  const unreadCount = matches.reduce((total, match) => total + match.unreadCount, 0);
  const selfProfile = useMemo(() => memberToDiscovery(memberProfile), [memberProfile]);

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return candidates;
    return candidates.filter((profile) =>
      [
        profile.displayName,
        profile.city,
        profile.state,
        profile.country,
        profile.tribe,
        profile.occupation,
        ...profile.interests,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [candidates, search]);

  const showToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 2600);
  };

  useEffect(() => {
    void fetch("/api/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ online: true }),
    });

    const heartbeat = window.setInterval(() => {
      void fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ online: true }),
      });
    }, 60_000);

    const setOffline = () => {
      void fetch("/api/presence", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ online: false }),
      });
    };

    window.addEventListener("pagehide", setOffline);
    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener("pagehide", setOffline);
    };
  }, []);

  useEffect(() => {
    if (!activeMatch || activeMatch.source !== "member") return;

    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`match-${activeMatch.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${activeMatch.id}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            match_id: string;
            sender_id: string;
            body: string;
            message_type: "text" | "image" | "voice";
            media_url: string | null;
            read_at: string | null;
            created_at: string;
          };
          const incoming: MatchMessage = {
            id: row.id,
            matchId: row.match_id,
            senderId: row.sender_id,
            body: row.body,
            messageType: row.message_type,
            mediaUrl: row.media_url,
            readAt: row.read_at,
            createdAt: row.created_at,
          };

          setMessages((previous) =>
            previous.some((item) => item.id === incoming.id)
              ? previous
              : [...previous, incoming],
          );
          setMatches((previous) =>
            previous.map((match) =>
              match.id === activeMatch.id
                ? {
                    ...match,
                    lastMessage: incoming.body,
                    lastMessageAt: incoming.createdAt,
                    unreadCount: 0,
                  }
                : match,
            ),
          );
          void apiRequest(`/api/matches/${activeMatch.id}/read`, {
            method: "POST",
          }).catch(() => undefined);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeMatch]);

  const finishInteraction = async (
    profile: DiscoveryProfile,
    action: InteractionAction,
  ) => {
    setCandidates((previous) => previous.filter((item) => item.id !== profile.id));
    setDrag({ x: 0, y: 0 });
    setAnimating(false);
    setBusyProfileId(profile.id);

    if (profile.source === "showcase") {
      let showcaseMatch: MatchSummary | null = null;
      if (action === "like") {
        showcaseMatch = {
          id: `showcase-match-${profile.id}`,
          source: "showcase",
          profile,
          lastMessage: "Showcase conversation — real matches use Supabase.",
          lastMessageAt: new Date().toISOString(),
          unreadCount: 0,
          createdAt: new Date().toISOString(),
        };
        setMatches((previous) => [
          showcaseMatch!,
          ...previous.filter((match) => match.id !== showcaseMatch!.id),
        ]);
        setOverlay({ type: "match", profile, match: showcaseMatch });
      } else if (action === "super_like") {
        showToast(`Showcase Super Like sent to ${profile.displayName}`);
      }
      setHistory((previous) => [
        ...previous.slice(-7),
        { profile, action, matchId: showcaseMatch?.id },
      ]);
      setBusyProfileId(null);
      return;
    }

    try {
      const result = await apiRequest<{
        matched: boolean;
        match: MatchSummary | null;
      }>("/api/interactions", {
        method: "POST",
        body: JSON.stringify({ targetId: profile.id, action }),
      });

      if (result.matched && result.match) {
        setMatches((previous) => [
          result.match!,
          ...previous.filter((match) => match.id !== result.match!.id),
        ]);
        setIncomingLikes((previous) =>
          previous.filter((item) => item.id !== profile.id),
        );
        setOverlay({ type: "match", profile, match: result.match });
      } else if (action === "like") {
        showToast(`Like sent to ${profile.displayName}`);
      } else if (action === "super_like") {
        showToast(`Super Like sent to ${profile.displayName}`);
      }

      setHistory((previous) => [
        ...previous.slice(-7),
        { profile, action, matchId: result.match?.id },
      ]);
    } catch (error) {
      setCandidates((previous) => [profile, ...previous]);
      showToast(error instanceof Error ? error.message : "Unable to save your choice.");
    } finally {
      setBusyProfileId(null);
    }
  };

  const swipe = (action: InteractionAction) => {
    if (!current || animating || busyProfileId) return;

    setDragging(false);
    setAnimating(true);
    setDrag(
      action === "pass"
        ? { x: -540, y: 48 }
        : action === "like"
          ? { x: 540, y: 48 }
          : { x: 0, y: -650 },
    );

    window.setTimeout(() => {
      void finishInteraction(current, action);
    }, 300);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (animating || busyProfileId) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging || animating) return;
    setDrag((previous) => ({
      x: previous.x + event.movementX,
      y: Math.max(-150, Math.min(110, previous.y + event.movementY)),
    }));
  };

  const onPointerUp = () => {
    if (!dragging || animating) return;
    setDragging(false);
    if (drag.x > 105) return swipe("like");
    if (drag.x < -105) return swipe("pass");
    if (drag.y < -100) return swipe("super_like");
    setDrag({ x: 0, y: 0 });
  };

  const undoSwipe = async () => {
    const previous = history.at(-1);
    if (!previous || busyProfileId) {
      showToast("Nothing to undo yet");
      return;
    }

    setBusyProfileId(previous.profile.id);

    try {
      if (previous.profile.source === "member") {
        await apiRequest("/api/interactions", {
          method: "DELETE",
          body: JSON.stringify({ targetId: previous.profile.id }),
        });
      }

      setHistory((items) => items.slice(0, -1));
      setCandidates((items) => [
        previous.profile,
        ...items.filter((item) => item.id !== previous.profile.id),
      ]);
      if (previous.matchId) {
        setMatches((items) => items.filter((match) => match.id !== previous.matchId));
      }
      showToast("Last choice restored");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to undo.");
    } finally {
      setBusyProfileId(null);
    }
  };

  const openMatch = async (match: MatchSummary) => {
    setActiveMatch(match);
    setTab("chat");
    setOverlay(null);
    setMatches((previous) =>
      previous.map((item) =>
        item.id === match.id ? { ...item, unreadCount: 0 } : item,
      ),
    );

    if (match.source === "showcase") {
      setMessages([
        {
          id: `showcase-message-${match.id}`,
          matchId: match.id,
          senderId: match.profile.id,
          body: "Hi! This is a showcase conversation. Create another real account to test live messaging.",
          messageType: "text",
          mediaUrl: null,
          readAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ]);
      return;
    }

    setLoadingMessages(true);
    try {
      const result = await apiRequest<{ messages: MatchMessage[] }>(
        `/api/matches/${match.id}/messages`,
      );
      setMessages(result.messages);
      await apiRequest(`/api/matches/${match.id}/read`, { method: "POST" });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to load chat.");
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    const body = message.trim();
    if (!activeMatch || !body || sendingMessage) return;

    if (activeMatch.source === "showcase") {
      const localMessage: MatchMessage = {
        id: `local-${crypto.randomUUID()}`,
        matchId: activeMatch.id,
        senderId: memberProfile.id,
        body,
        messageType: "text",
        mediaUrl: null,
        readAt: null,
        createdAt: new Date().toISOString(),
      };
      setMessages((previous) => [...previous, localMessage]);
      setMessage("");
      setMatches((previous) =>
        previous.map((match) =>
          match.id === activeMatch.id
            ? { ...match, lastMessage: body, lastMessageAt: localMessage.createdAt }
            : match,
        ),
      );
      return;
    }

    setSendingMessage(true);
    setMessage("");

    try {
      const result = await apiRequest<{ message: MatchMessage }>(
        `/api/matches/${activeMatch.id}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ body }),
        },
      );
      setMessages((previous) =>
        previous.some((item) => item.id === result.message.id)
          ? previous
          : [...previous, result.message],
      );
      setMatches((previous) =>
        previous.map((match) =>
          match.id === activeMatch.id
            ? {
                ...match,
                lastMessage: body,
                lastMessageAt: result.message.createdAt,
              }
            : match,
        ),
      );
    } catch (error) {
      setMessage(body);
      showToast(error instanceof Error ? error.message : "Unable to send message.");
    } finally {
      setSendingMessage(false);
    }
  };

  const unmatch = async (match: MatchSummary) => {
    if (!window.confirm(`Unmatch ${match.profile.displayName}? Your conversation will be removed.`)) {
      return;
    }

    try {
      if (match.source === "member") {
        await apiRequest(`/api/matches/${match.id}/unmatch`, { method: "POST" });
      }
      setMatches((previous) => previous.filter((item) => item.id !== match.id));
      setActiveMatch(null);
      setMessages([]);
      showToast("Match removed");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to unmatch.");
    }
  };

  const blockProfile = async (profile: DiscoveryProfile) => {
    if (profile.source === "showcase") {
      setCandidates((previous) => previous.filter((item) => item.id !== profile.id));
      setMatches((previous) =>
        previous.filter((match) => match.profile.id !== profile.id),
      );
      setOverlay(null);
      showToast("Showcase profile hidden");
      return;
    }

    if (!window.confirm(`Block ${profile.displayName}? They will no longer appear to you.`)) {
      return;
    }

    try {
      await apiRequest("/api/safety/block", {
        method: "POST",
        body: JSON.stringify({ memberId: profile.id }),
      });
      setCandidates((previous) => previous.filter((item) => item.id !== profile.id));
      setIncomingLikes((previous) => previous.filter((item) => item.id !== profile.id));
      setMatches((previous) =>
        previous.filter((match) => match.profile.id !== profile.id),
      );
      if (activeMatch?.profile.id === profile.id) {
        setActiveMatch(null);
        setMessages([]);
      }
      setOverlay(null);
      showToast("Member blocked");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to block member.");
    }
  };

  const submitReport = async (
    profile: DiscoveryProfile,
    matchId: string | undefined,
    draft: SafetyReportDraft,
  ) => {
    if (profile.source === "showcase") {
      setOverlay(null);
      showToast("Showcase report recorded locally");
      return;
    }

    const result = await apiRequest<{ relationshipClosed?: boolean }>("/api/safety/report", {
      method: "POST",
      body: JSON.stringify({
        memberId: profile.id,
        matchId: matchId || null,
        ...draft,
      }),
    });

    if (result.relationshipClosed) {
      setMatches((previous) => previous.filter((match) => match.profile.id !== profile.id));
      setCandidates((previous) => previous.filter((item) => item.id !== profile.id));
      setIncomingLikes((previous) => previous.filter((item) => item.id !== profile.id));
      if (activeMatch?.profile.id === profile.id) {
        setActiveMatch(null);
        setMessages([]);
      }
    }

    setOverlay(null);
    showToast("Safety report submitted confidentially");
  };

  const requestVerification = async () => {
    const note = window.prompt("Optional note for the verification team:") || "";
    try {
      await apiRequest("/api/verification/request", {
        method: "POST",
        body: JSON.stringify({ note }),
      });
      setOverlay(null);
      showToast("Verification request submitted");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to request verification.");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-0 sm:p-4">
      <section className="relative flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-[#0d0f14] shadow-[0_0_100px_rgba(242,201,76,0.18)] sm:h-[min(860px,calc(100vh-32px))] sm:rounded-[38px] sm:border sm:border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(242,201,76,0.16),transparent_31%),radial-gradient(circle_at_bottom_left,rgba(77,163,255,0.07),transparent_32%)]" />

        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          {tab === "home" && (
            <HomeScreen
              memberProfile={memberProfile}
              candidates={filteredCandidates}
              matches={matches}
              incomingLikeCount={incomingLikes.length}
              showcaseMode={initialData.showcaseMode}
              search={search}
              setSearch={setSearch}
              setTab={setTab}
              openDetails={(profile) => setOverlay({ type: "details", profile })}
              openMatch={openMatch}
              openNotifications={() => setOverlay({ type: "notifications" })}
              openPremium={() => setOverlay({ type: "premium" })}
              unreadCount={unreadCount}
            />
          )}

          {tab === "discover" && (
            <DiscoverScreen
              current={current}
              next={next}
              third={third}
              drag={drag}
              dragging={dragging}
              animating={animating}
              busy={Boolean(busyProfileId)}
              showcaseMode={initialData.showcaseMode}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              swipe={swipe}
              undoSwipe={undoSwipe}
              openDetails={(profile) => setOverlay({ type: "details", profile })}
              openSafety={(profile) => setOverlay({ type: "safety", profile })}
              openPremium={() => setOverlay({ type: "premium" })}
              refresh={() => window.location.reload()}
            />
          )}

          {tab === "likes" && (
            <LikesScreen
              likes={incomingLikes}
              fallbackProfiles={candidates}
              openPremium={() => setOverlay({ type: "premium" })}
            />
          )}

          {tab === "chat" && (
            <ChatScreen
              memberId={memberProfile.id}
              matches={matches}
              activeMatch={activeMatch}
              messages={messages}
              message={message}
              loadingMessages={loadingMessages}
              sendingMessage={sendingMessage}
              setMessage={setMessage}
              openMatch={openMatch}
              closeMatch={() => {
                setActiveMatch(null);
                setMessages([]);
              }}
              sendMessage={sendMessage}
              unmatch={unmatch}
              openSafety={(profile, matchId) =>
                setOverlay({ type: "safety", profile, matchId })
              }
              showToast={showToast}
            />
          )}

          {tab === "profile" && (
            <ProfileScreen
              memberProfile={memberProfile}
              profile={selfProfile}
              matchCount={matches.length}
              incomingLikeCount={incomingLikes.length}
              editProfile={() => router.push("/profile/edit")}
              openSettings={() => setOverlay({ type: "settings" })}
              openPremium={() => setOverlay({ type: "premium" })}
            />
          )}
        </div>

        {!overlay && !(tab === "chat" && activeMatch) && (
          <BottomNav
            tab={tab}
            unreadCount={unreadCount}
            likeCount={incomingLikes.length}
            setTab={(nextTab) => {
              setTab(nextTab);
              if (nextTab !== "chat") {
                setActiveMatch(null);
                setMessages([]);
              }
            }}
          />
        )}

        {overlay?.type === "details" && (
          <DetailsOverlay
            profile={overlay.profile}
            close={() => setOverlay(null)}
            like={() => {
              setOverlay(null);
              if (candidates.some((item) => item.id === overlay.profile.id)) {
                void finishInteraction(overlay.profile, "like");
              } else {
                showToast("This profile is already in your activity.");
              }
            }}
            openSafety={() =>
              setOverlay({ type: "safety", profile: overlay.profile })
            }
          />
        )}

        {overlay?.type === "match" && (
          <MatchOverlay
            memberProfile={selfProfile}
            profile={overlay.profile}
            showcase={overlay.match.source === "showcase"}
            close={() => setOverlay(null)}
            openChat={() => void openMatch(overlay.match)}
          />
        )}

        {overlay?.type === "premium" && (
          <PremiumOverlay close={() => setOverlay(null)} showToast={showToast} />
        )}

        {overlay?.type === "notifications" && (
          <NotificationsOverlay
            likes={incomingLikes.length}
            matches={matches}
            close={() => setOverlay(null)}
          />
        )}

        {overlay?.type === "settings" && (
          <SettingsOverlay
            settings={settings}
            setSettings={setSettings}
            close={() => setOverlay(null)}
            editProfile={() => router.push("/profile/edit")}
            requestVerification={() => void requestVerification()}
            showToast={showToast}
          />
        )}

        {overlay?.type === "safety" && (
          <SafetyOverlay
            profile={overlay.profile}
            matchId={overlay.matchId}
            messages={overlay.matchId && activeMatch?.id === overlay.matchId ? messages : []}
            memberId={memberProfile.id}
            close={() => setOverlay(null)}
            block={() => void blockProfile(overlay.profile)}
            report={(draft) => submitReport(overlay.profile, overlay.matchId, draft)}
          />
        )}

        {toast && (
          <div className="absolute inset-x-5 bottom-24 z-[90] rounded-2xl border border-[#F2C94C]/25 bg-[#1c1b16]/95 px-4 py-3 text-center text-sm font-bold text-[#FFE58C] shadow-2xl backdrop-blur-xl">
            {toast}
          </div>
        )}
      </section>
    </main>
  );
}

function AppHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="min-w-0">
<BrandLogo size="sm" />
        <h1 className="mt-1 truncate text-[27px] font-black tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-white/38">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

function HomeScreen({
  memberProfile,
  candidates,
  matches,
  incomingLikeCount,
  showcaseMode,
  search,
  setSearch,
  setTab,
  openDetails,
  openMatch,
  openNotifications,
  openPremium,
  unreadCount,
}: {
  memberProfile: MemberProfile;
  candidates: DiscoveryProfile[];
  matches: MatchSummary[];
  incomingLikeCount: number;
  showcaseMode: boolean;
  search: string;
  setSearch: (value: string) => void;
  setTab: (tab: MainTab) => void;
  openDetails: (profile: DiscoveryProfile) => void;
  openMatch: (match: MatchSummary) => void;
  openNotifications: () => void;
  openPremium: () => void;
  unreadCount: number;
}) {
  const firstName = memberProfile.display_name.split(" ")[0] || "there";

  return (
    <div className="app-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-7 pt-5">
      <AppHeader
        title={`Hi, ${firstName}.`}
        subtitle="Your next genuine connection could be here."
        action={
          <button
            onClick={openNotifications}
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-white/65"
            aria-label="Notifications"
          >
            <DatingIcon name="bell" />
            {(incomingLikeCount + unreadCount) > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F2C94C] px-1 text-[8px] font-black text-black">
                {Math.min(incomingLikeCount + unreadCount, 9)}
              </span>
            )}
          </button>
        }
      />

      {showcaseMode && (
        <div className="mt-5 rounded-2xl border border-blue-400/20 bg-blue-400/[0.07] p-3.5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-400/10 text-blue-300">
              <DatingIcon name="shield" className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-black text-blue-100">Live matching is active</p>
              <p className="mt-1 text-[11px] leading-4 text-blue-100/50">
                Showcase profiles are displayed until another completed member profile joins.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="relative mt-5">
        <DatingIcon
          name="search"
          className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30"
        />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, city or country"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.045] py-3.5 pl-12 pr-12 text-sm outline-none transition focus:border-[#F2C94C]/50"
        />
        <button
          onClick={() => setTab("discover")}
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#F2C94C]"
          aria-label="Open discovery"
        >
          <DatingIcon name="filter" className="h-4 w-4" />
        </button>
      </div>

      <section className="mt-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[9px] font-black tracking-[0.25em] text-white/30">TOP PICKS</p>
            <h2 className="mt-1 text-lg font-black">Chosen for you</h2>
          </div>
          <button onClick={() => setTab("discover")} className="text-xs font-bold text-[#F2C94C]">
            See all
          </button>
        </div>

        <div className="app-scroll mt-3 flex gap-3 overflow-x-auto pb-1">
          {candidates.slice(0, 5).map((profile) => (
            <button
              key={profile.id}
              onClick={() => openDetails(profile)}
              className="relative h-44 w-32 shrink-0 overflow-hidden rounded-[22px] border border-white/10 bg-[#171a21] text-left"
            >
              <ProfilePhoto profile={profile} sizes="128px" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-transparent" />
              <div className="absolute inset-x-3 bottom-3">
                <p className="truncate text-sm font-black">{profileTitle(profile)}</p>
                <p className="mt-0.5 truncate text-[10px] text-[#FFE58C]">
                  {profile.compatibility}% match
                </p>
              </div>
            </button>
          ))}
          {!candidates.length && (
            <button
              onClick={() => setTab("discover")}
              className="flex h-44 w-full items-center justify-center rounded-[22px] border border-dashed border-white/12 text-xs text-white/35"
            >
              Refresh discovery
            </button>
          )}
        </div>
      </section>

      <button
        onClick={openPremium}
        className="gold-shine mt-6 flex w-full items-center gap-3 rounded-[22px] border border-[#F2C94C]/55 bg-[linear-gradient(120deg,rgba(242,201,76,0.18),rgba(242,201,76,0.05))] p-4 text-left"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F2C94C] text-black">
          <DatingIcon name="crown" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-[#FFE58C]">AFROLOVE GOLD</span>
          <span className="mt-0.5 block text-[10px] text-white/42">
            See likes, boost visibility and match faster.
          </span>
        </span>
        <DatingIcon name="chevron" className="h-4 w-4 text-[#F2C94C]" />
      </button>

      <section className="mt-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[9px] font-black tracking-[0.25em] text-white/30">CONNECTIONS</p>
            <h2 className="mt-1 text-lg font-black">Recent matches</h2>
          </div>
          <button onClick={() => setTab("chat")} className="text-xs font-bold text-[#F2C94C]">
            Messages
          </button>
        </div>

        <div className="mt-3 space-y-2.5">
          {matches.slice(0, 3).map((match) => (
            <button
              key={match.id}
              onClick={() => void openMatch(match)}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3 text-left"
            >
              <SmallAvatar profile={match.profile} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-sm font-black">
                  {match.profile.displayName}
                  {match.profile.verified && (
                    <span className="text-blue-300">●</span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-white/38">
                  {match.lastMessage}
                </span>
              </span>
              <span className="text-[10px] text-white/25">{relativeTime(match.lastMessageAt)}</span>
            </button>
          ))}
          {!matches.length && (
            <button
              onClick={() => setTab("discover")}
              className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-white/10 p-4 text-left"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F2C94C]/10 text-[#F2C94C]">
                <DatingIcon name="heart" />
              </span>
              <span>
                <span className="block text-sm font-bold">Your matches will appear here</span>
                <span className="mt-1 block text-[11px] text-white/35">Start discovering compatible profiles.</span>
              </span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function DiscoverScreen({
  current,
  next,
  third,
  drag,
  dragging,
  animating,
  busy,
  showcaseMode,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  swipe,
  undoSwipe,
  openDetails,
  openSafety,
  openPremium,
  refresh,
}: {
  current: DiscoveryProfile | null;
  next: DiscoveryProfile | null;
  third: DiscoveryProfile | null;
  drag: { x: number; y: number };
  dragging: boolean;
  animating: boolean;
  busy: boolean;
  showcaseMode: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: () => void;
  swipe: (action: InteractionAction) => void;
  undoSwipe: () => void;
  openDetails: (profile: DiscoveryProfile) => void;
  openSafety: (profile: DiscoveryProfile) => void;
  openPremium: () => void;
  refresh: () => void;
}) {
  const likeOpacity = Math.min(Math.max(drag.x / 100, 0), 1);
  const nopeOpacity = Math.min(Math.max(-drag.x / 100, 0), 1);
  const superOpacity = Math.min(Math.max(-drag.y / 100, 0), 1);

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-3 pt-4">
      <AppHeader
        title="Discover"
        subtitle={showcaseMode ? "Discover people across Africa" : "Real members based on your preferences"}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => void undoSwipe()}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/55"
              aria-label="Undo last swipe"
            >
              <DatingIcon name="undo" className="h-4 w-4" />
            </button>
            <button
              onClick={openPremium}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#F2C94C]/25 bg-[#F2C94C]/10 text-[#F2C94C]"
              aria-label="Discovery filters"
            >
              <DatingIcon name="filter" className="h-4 w-4" />
            </button>
          </div>
        }
      />

      <button
        onClick={openPremium}
        className="gold-shine mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(90deg,#F2C94C,#FFE58C)] py-2 text-xs font-black text-black"
      >
        <DatingIcon name="crown" className="h-4 w-4" />
        Upgrade to see who likes you
      </button>

      <div className="relative mt-3 min-h-0 flex-1">
        {third && <StackShadow profile={third} level={2} />}
        {next && <StackShadow profile={next} level={1} />}

        {current ? (
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              transform: `translate3d(${drag.x}px, ${drag.y}px, 0) rotate(${drag.x / 18}deg)`,
              transition: dragging ? "none" : "transform 280ms cubic-bezier(.2,.8,.2,1)",
            }}
            className="card-grab absolute inset-x-0 top-0 h-[calc(100%-8px)] overflow-hidden rounded-[28px] border border-white/15 bg-[#171a21] shadow-2xl"
          >
            <ProfilePhoto profile={current} priority className="pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,.96)_4%,rgba(0,0,0,.5)_42%,transparent_68%)]" />

            <div
              style={{ opacity: likeOpacity }}
              className="absolute left-5 top-16 rotate-[-12deg] rounded-lg border-4 border-emerald-400 px-3 py-1 text-3xl font-black text-emerald-400"
            >
              LIKE
            </div>
            <div
              style={{ opacity: nopeOpacity }}
              className="absolute right-5 top-16 rotate-[12deg] rounded-lg border-4 border-red-400 px-3 py-1 text-3xl font-black text-red-400"
            >
              NOPE
            </div>
            <div
              style={{ opacity: superOpacity }}
              className="absolute left-1/2 top-14 -translate-x-1/2 rounded-lg border-4 border-blue-400 px-3 py-1 text-xl font-black text-blue-400"
            >
              SUPER LIKE
            </div>

            <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
              <div className="flex max-w-[calc(100%_-_44px)] flex-wrap gap-1.5">
                {current.verified && (
                  <span className="flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[9px] font-black backdrop-blur-md">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-400 text-white">
                      <DatingIcon name="check" className="h-2.5 w-2.5" />
                    </span>
                    Verified
                  </span>
                )}
                {current.online && (
                  <span className="rounded-full bg-emerald-400/85 px-2.5 py-1 text-[9px] font-black text-[#05291d]">● Online</span>
                )}
                {current.source === "showcase" && (
                  <span className="rounded-full bg-blue-400/80 px-2.5 py-1 text-[9px] font-black text-[#07172c]">SHOWCASE</span>
                )}
              </div>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  openSafety(current);
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/55 text-white/75 backdrop-blur-md"
                aria-label="Safety options"
              >
                <DatingIcon name="more" className="h-5 w-5" />
              </button>
            </div>

            <button
              onClick={(event) => {
                event.stopPropagation();
                openDetails(current);
              }}
              className="absolute inset-x-0 bottom-0 p-5 text-left"
            >
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-[29px] font-black tracking-tight">{profileTitle(current)}</h2>
                    <span className="rounded-full bg-[#F2C94C] px-2 py-1 text-[9px] font-black text-black">{current.compatibility}%</span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#FFE58C]">
                    <DatingIcon name="pin" className="h-4 w-4" />
                    {current.proximityLabel} · {current.tribe}
                  </p>
                </div>
                <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-[10px] font-bold text-white/70 backdrop-blur-md">
                  {current.joinedLabel}
                </span>
              </div>

              <p className="mt-3 line-clamp-2 text-sm leading-5 text-white/75">{current.bio}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {current.interests.slice(0, 3).map((interest) => (
                  <span key={interest} className="rounded-full border border-white/12 bg-black/35 px-3 py-1 text-[10px] font-bold backdrop-blur-md">
                    {interest}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-center text-[8px] font-black tracking-[0.28em] text-white/25">
                DRAG LEFT OR RIGHT · SWIPE UP FOR SUPER LIKE
              </p>
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[28px] border border-dashed border-white/12 bg-white/[0.025] px-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F2C94C]/10 text-[#F2C94C]">
              <DatingIcon name="refresh" className="h-7 w-7" />
            </span>
            <h2 className="mt-5 text-xl font-black">You are all caught up</h2>
            <p className="mt-2 text-sm leading-5 text-white/40">
              New compatible profiles will appear as members complete onboarding.
            </p>
            <button onClick={refresh} className="mt-5 rounded-full bg-[#F2C94C] px-5 py-2.5 text-xs font-black text-black">
              Refresh discovery
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-center gap-4">
        <ActionButton label="Pass" icon="x" tone="pass" disabled={!current || busy || animating} onClick={() => swipe("pass")} />
        <ActionButton label="Super Like" icon="star" tone="super" disabled={!current || busy || animating} onClick={() => swipe("super_like")} />
        <ActionButton label="Like" icon="heart" tone="like" disabled={!current || busy || animating} onClick={() => swipe("like")} />
      </div>
    </div>
  );
}

function StackShadow({ profile, level }: { profile: DiscoveryProfile; level: 1 | 2 }) {
  return (
    <div
      style={{
        transform: level === 1 ? "translateY(9px) scale(.965)" : "translateY(17px) scale(.93)",
        opacity: level === 1 ? 0.7 : 0.35,
      }}
      className="absolute inset-x-0 top-0 h-[calc(100%-8px)] overflow-hidden rounded-[28px] border border-white/10 bg-[#171a21]"
    >
      <ProfilePhoto profile={profile} />
      <div className="absolute inset-0 bg-black/50" />
    </div>
  );
}

function ActionButton({
  label,
  icon,
  tone,
  disabled,
  onClick,
}: {
  label: string;
  icon: DatingIconName;
  tone: "pass" | "super" | "like";
  disabled: boolean;
  onClick: () => void;
}) {
  const classes =
    tone === "pass"
      ? "bg-white text-red-500"
      : tone === "super"
        ? "bg-blue-500 text-white"
        : "bg-[#F2C94C] text-black shadow-[0_0_28px_rgba(242,201,76,.35)]";

  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-13 w-13 items-center justify-center rounded-full transition active:scale-90 disabled:cursor-not-allowed disabled:opacity-35 ${classes}`}
    >
      <DatingIcon name={icon} className="h-6 w-6" />
    </button>
  );
}

function LikesScreen({
  likes,
  fallbackProfiles,
  openPremium,
}: {
  likes: DiscoveryProfile[];
  fallbackProfiles: DiscoveryProfile[];
  openPremium: () => void;
}) {
  const visibleLikes = likes.length ? likes : fallbackProfiles.slice(0, 4);

  return (
    <div className="app-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-7 pt-5">
      <AppHeader title="Likes you" subtitle="People interested in meeting you" />

      <div className="mt-5 overflow-hidden rounded-[24px] border border-[#F2C94C]/35 bg-[linear-gradient(135deg,rgba(242,201,76,.2),rgba(242,201,76,.04))] p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F2C94C] text-black">
            <DatingIcon name="crown" />
          </span>
          <div>
            <p className="text-lg font-black">{likes.length || "New"} profile{likes.length === 1 ? "" : "s"} like you</p>
            <p className="mt-1 text-xs text-white/45">Unlock Gold to reveal them instantly.</p>
          </div>
        </div>
        <button onClick={openPremium} className="mt-5 w-full rounded-2xl bg-[#F2C94C] py-3 text-sm font-black text-black">
          See who likes you
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {visibleLikes.map((profile) => (
          <button
            key={profile.id}
            onClick={openPremium}
            className="relative h-60 overflow-hidden rounded-[22px] border border-white/10 bg-[#171a21] text-left"
          >
            <ProfilePhoto profile={profile} sizes="190px" className="scale-105 blur-[13px]" />
            <div className="absolute inset-0 bg-black/20" />
            <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-[#FFE58C] backdrop-blur-md">
              <DatingIcon name="lock" className="h-4 w-4" />
            </span>
            <div className="absolute inset-x-3 bottom-3">
              <p className="text-sm font-black">Someone nearby</p>
              <p className="mt-1 text-[10px] text-white/50">Tap to unlock</p>
            </div>
          </button>
        ))}
      </div>

      {!visibleLikes.length && (
        <div className="mt-8 rounded-3xl border border-dashed border-white/10 p-8 text-center">
          <DatingIcon name="heart" className="mx-auto h-8 w-8 text-white/20" />
          <p className="mt-4 text-sm font-bold">No incoming likes yet</p>
          <p className="mt-1 text-xs text-white/35">Complete profiles and regular activity receive more attention.</p>
        </div>
      )}
    </div>
  );
}

function ChatScreen({
  memberId,
  matches,
  activeMatch,
  messages,
  message,
  loadingMessages,
  sendingMessage,
  setMessage,
  openMatch,
  closeMatch,
  sendMessage,
  unmatch,
  openSafety,
  showToast,
}: {
  memberId: string;
  matches: MatchSummary[];
  activeMatch: MatchSummary | null;
  messages: MatchMessage[];
  message: string;
  loadingMessages: boolean;
  sendingMessage: boolean;
  setMessage: (value: string) => void;
  openMatch: (match: MatchSummary) => void;
  closeMatch: () => void;
  sendMessage: () => void;
  unmatch: (match: MatchSummary) => void;
  openSafety: (profile: DiscoveryProfile, matchId: string) => void;
  showToast: (text: string) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (activeMatch) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
          <button onClick={closeMatch} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.045] text-white/65" aria-label="Back to matches">
            <DatingIcon name="back" className="h-4 w-4" />
          </button>
          <SmallAvatar profile={activeMatch.profile} size="h-10 w-10" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black">{activeMatch.profile.displayName}</p>
            <p className="mt-0.5 text-[10px] text-emerald-300/70">{activeMatch.profile.online ? "Online now" : activeMatch.profile.joinedLabel}</p>
          </div>
          <button onClick={() => openSafety(activeMatch.profile, activeMatch.id)} className="flex h-9 w-9 items-center justify-center rounded-full text-white/50" aria-label="Safety options">
            <DatingIcon name="more" />
          </button>
        </header>

        <div className="app-scroll min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <div className="mx-auto mb-6 max-w-[260px] text-center">
            <SmallAvatar profile={activeMatch.profile} size="mx-auto h-16 w-16" />
            <p className="mt-3 text-sm font-black">You matched with {activeMatch.profile.displayName}</p>
            <p className="mt-1 text-[11px] leading-4 text-white/35">Be respectful, stay genuine and never share financial information.</p>
          </div>

          {loadingMessages ? (
            <div className="flex justify-center py-10">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-[#F2C94C]" />
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((item) => {
                const mine = item.senderId === memberId;
                return (
                  <div key={item.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-[20px] px-4 py-2.5 ${mine ? "rounded-br-md bg-[#F2C94C] text-black" : "rounded-bl-md bg-white/[0.07] text-white"}`}>
                      <p className="whitespace-pre-wrap text-sm leading-5">{item.body}</p>
                      <div className={`mt-1 flex items-center justify-end gap-1 text-[8px] ${mine ? "text-black/45" : "text-white/25"}`}>
                        {relativeTime(item.createdAt)}
                        {mine && <span>{item.readAt ? "✓✓" : "✓"}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {!messages.length && (
                <p className="py-8 text-center text-xs text-white/30">Start the conversation with a thoughtful hello.</p>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <div className="border-t border-white/[0.07] bg-[#0d0f14]/95 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <div className="flex items-end gap-2">
            <button onClick={() => showToast("Photo messages are coming in the media phase") } className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/38" aria-label="Attach photo">
              <DatingIcon name="image" />
            </button>
            <textarea
              rows={1}
              maxLength={2000}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Write a message..."
              className="max-h-28 min-h-10 flex-1 resize-none rounded-[20px] border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm outline-none focus:border-[#F2C94C]/40"
            />
            <button
              disabled={!message.trim() || sendingMessage}
              onClick={sendMessage}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F2C94C] text-black disabled:opacity-35"
              aria-label="Send message"
            >
              {sendingMessage ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/25 border-t-black" /> : <DatingIcon name="send" className="h-4 w-4" />}
            </button>
          </div>
          <button onClick={() => void unmatch(activeMatch)} className="mx-auto mt-2 block text-[9px] font-bold text-white/20 hover:text-red-300">Unmatch</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-7 pt-5">
      <AppHeader title="Messages" subtitle="Your real matches and conversations" />

      <div className="mt-5 space-y-2.5">
        {matches.map((match) => (
          <button
            key={match.id}
            onClick={() => void openMatch(match)}
            className="flex w-full items-center gap-3 rounded-[20px] border border-white/[0.07] bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.05]"
          >
            <SmallAvatar profile={match.profile} size="h-14 w-14" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-sm font-black">{profileTitle(match.profile)}</span>
                {match.source === "showcase" && <span className="rounded bg-blue-400/10 px-1.5 py-0.5 text-[7px] font-black text-blue-300">DEMO</span>}
              </span>
              <span className={`mt-1 block truncate text-[11px] ${match.unreadCount ? "font-bold text-white/70" : "text-white/35"}`}>{match.lastMessage}</span>
            </span>
            <span className="flex flex-col items-end gap-2">
              <span className="text-[9px] text-white/25">{relativeTime(match.lastMessageAt)}</span>
              {match.unreadCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F2C94C] px-1 text-[9px] font-black text-black">{Math.min(match.unreadCount, 9)}</span>}
            </span>
          </button>
        ))}
      </div>

      {!matches.length && (
        <div className="mt-12 text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-white/20">
            <DatingIcon name="chat" className="h-8 w-8" />
          </span>
          <h2 className="mt-5 text-xl font-black">No matches yet</h2>
          <p className="mx-auto mt-2 max-w-[270px] text-sm leading-5 text-white/38">When two members like each other, their private conversation opens here.</p>
        </div>
      )}
    </div>
  );
}

function ProfileScreen({
  memberProfile,
  profile,
  matchCount,
  incomingLikeCount,
  editProfile,
  openSettings,
  openPremium,
}: {
  memberProfile: MemberProfile;
  profile: DiscoveryProfile;
  matchCount: number;
  incomingLikeCount: number;
  editProfile: () => void;
  openSettings: () => void;
  openPremium: () => void;
}) {
  return (
    <div className="app-scroll min-h-0 flex-1 overflow-y-auto pb-7">
      <div className="relative h-80 overflow-hidden">
        <ProfilePhoto profile={profile} priority />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f14] via-transparent to-black/45" />
        <div className="absolute inset-x-5 top-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black tracking-[0.32em] text-[#F2C94C]">YOUR PROFILE</p>
            <p className="mt-1 text-xs text-white/45">{memberProfile.profile_completion}% complete</p>
          </div>
          <button onClick={openSettings} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white/75 backdrop-blur-md" aria-label="Settings">
            <DatingIcon name="settings" className="h-5 w-5" />
          </button>
        </div>
        <div className="absolute inset-x-5 bottom-5">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black">{profileTitle(profile)}</h1>
            {profile.verified && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-400 text-white"><DatingIcon name="check" className="h-3 w-3" /></span>}
          </div>
          <p className="mt-1 text-sm font-bold text-[#FFE58C]">{profile.occupation} · {profile.city}</p>
        </div>
      </div>

      <div className="px-5">
        <div className="grid grid-cols-3 gap-2">
          <ProfileStat label="Completion" value={`${memberProfile.profile_completion}%`} />
          <ProfileStat label="Matches" value={String(matchCount)} />
          <ProfileStat label="Likes" value={String(incomingLikeCount)} />
        </div>

        <button onClick={editProfile} className="mt-4 w-full rounded-2xl bg-[#F2C94C] py-3 text-sm font-black text-black">Edit my profile</button>

        <section className="mt-6">
          <p className="text-[9px] font-black tracking-[0.25em] text-white/30">ABOUT ME</p>
          <p className="mt-2 text-sm leading-6 text-white/68">{profile.bio}</p>
        </section>

        <section className="mt-6">
          <p className="text-[9px] font-black tracking-[0.25em] text-white/30">INTERESTS</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.interests.map((interest) => <span key={interest} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white/65">{interest}</span>)}
          </div>
        </section>

        <button onClick={openPremium} className="mt-6 flex w-full items-center gap-3 rounded-[22px] border border-[#F2C94C]/30 bg-[#F2C94C]/[0.07] p-4 text-left">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F2C94C] text-black"><DatingIcon name="crown" /></span>
          <span className="flex-1"><span className="block text-sm font-black text-[#FFE58C]">Upgrade to Gold</span><span className="mt-1 block text-[10px] text-white/38">Boost your visibility and unlock incoming likes.</span></span>
          <DatingIcon name="chevron" className="h-4 w-4 text-[#F2C94C]" />
        </button>
      </div>
    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3 text-center"><p className="text-lg font-black text-[#FFE58C]">{value}</p><p className="mt-1 text-[8px] font-bold uppercase tracking-wider text-white/28">{label}</p></div>;
}

function BottomNav({
  tab,
  unreadCount,
  likeCount,
  setTab,
}: {
  tab: MainTab;
  unreadCount: number;
  likeCount: number;
  setTab: (tab: MainTab) => void;
}) {
  return (
    <nav className="relative z-30 grid grid-cols-5 border-t border-white/[0.07] bg-[#0d0f14]/95 px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
      {navItems.map((item) => {
        const active = tab === item.id;
        const badge = item.id === "chat" ? unreadCount : item.id === "likes" ? likeCount : 0;
        return (
          <button key={item.id} onClick={() => setTab(item.id)} className={`relative flex flex-col items-center gap-1 py-1.5 text-[10px] font-bold transition ${active ? "text-[#F2C94C]" : "text-white/30"}`}>
            {active && <span className="absolute -top-2 h-0.5 w-8 rounded-full bg-[#F2C94C] shadow-[0_0_12px_rgba(242,201,76,.7)]" />}
            <span className="relative"><DatingIcon name={item.icon} className="h-5 w-5" />{badge > 0 && <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F2C94C] px-1 text-[8px] font-black text-black">{Math.min(badge, 9)}</span>}</span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function OverlayShell({ children, close }: { children: React.ReactNode; close: () => void }) {
  return (
    <div className="absolute inset-0 z-[70] flex flex-col bg-[#0b0d12]/98 backdrop-blur-2xl">
      <button onClick={close} className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white/65" aria-label="Close">
        <DatingIcon name="x" className="h-5 w-5" />
      </button>
      {children}
    </div>
  );
}

function DetailsOverlay({ profile, close, like, openSafety }: { profile: DiscoveryProfile; close: () => void; like: () => void; openSafety: () => void }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const photos = profile.photos.length ? profile.photos : profile.avatarUrl ? [profile.avatarUrl] : [];
  const photoProfile = photos.length ? { ...profile, photos: [photos[photoIndex]] } : profile;

  return (
    <OverlayShell close={close}>
      <div className="app-scroll min-h-0 flex-1 overflow-y-auto pb-28">
        <div className="relative h-[480px] overflow-hidden">
          <ProfilePhoto profile={photoProfile} priority />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d12] via-transparent to-black/35" />
          {photos.length > 1 && <div className="absolute inset-x-4 top-4 flex gap-1.5 pr-14">{photos.map((_, index) => <button key={index} onClick={() => setPhotoIndex(index)} className={`h-1 flex-1 rounded-full ${index === photoIndex ? "bg-white" : "bg-white/25"}`} aria-label={`View photo ${index + 1}`} />)}</div>}
          <div className="absolute inset-x-5 bottom-5">
            <div className="flex items-center gap-2"><h1 className="text-3xl font-black">{profileTitle(profile)}</h1>{profile.verified && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-400"><DatingIcon name="check" className="h-3 w-3" /></span>}</div>
            <p className="mt-1 text-sm font-bold text-[#FFE58C]">{profile.occupation} · {profile.city}</p>
          </div>
        </div>

        <div className="space-y-6 px-5">
          <div className="grid grid-cols-3 gap-2"><ProfileStat label="Match" value={`${profile.compatibility}%`} /><ProfileStat label="Height" value={profile.height} /><ProfileStat label="Tribe" value={profile.tribe} /></div>
          <DetailSection title="About me"><p className="text-sm leading-6 text-white/68">{profile.bio}</p></DetailSection>
          <DetailSection title="Looking for"><p className="text-sm leading-6 text-white/68">{profile.lookingFor}</p><p className="mt-2 text-xs font-bold text-[#FFE58C]">{profile.relationshipGoal}</p></DetailSection>
          <DetailSection title="Interests"><div className="flex flex-wrap gap-2">{profile.interests.map((interest) => <span key={interest} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold">{interest}</span>)}</div></DetailSection>
          <DetailSection title="Profile details"><div className="grid grid-cols-2 gap-2"><InfoTile label="Education" value={profile.education} /><InfoTile label="Religion" value={profile.religion} /><InfoTile label="Languages" value={profile.languages.join(", ") || "Not specified"} /><InfoTile label="Lifestyle" value={profile.lifestyle || "Not specified"} /></div></DetailSection>
          <button onClick={openSafety} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 py-3 text-xs font-bold text-white/35"><DatingIcon name="shield" className="h-4 w-4" />Safety and reporting</button>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex gap-3 border-t border-white/[0.07] bg-[#0b0d12]/95 p-4 pb-[max(16px,env(safe-area-inset-bottom))] backdrop-blur-xl">
        <button onClick={close} className="flex-1 rounded-2xl border border-white/10 py-3 text-sm font-black text-white/55">Not now</button>
        <button onClick={like} className="flex flex-[1.5] items-center justify-center gap-2 rounded-2xl bg-[#F2C94C] py-3 text-sm font-black text-black"><DatingIcon name="heart" className="h-4 w-4" />Like profile</button>
      </div>
    </OverlayShell>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><p className="mb-3 text-[9px] font-black uppercase tracking-[0.25em] text-white/30">{title}</p>{children}</section>;
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3"><p className="text-[8px] font-black uppercase tracking-wider text-white/25">{label}</p><p className="mt-1.5 text-xs font-bold text-white/65">{value}</p></div>;
}

function MatchOverlay({ memberProfile, profile, showcase, close, openChat }: { memberProfile: DiscoveryProfile; profile: DiscoveryProfile; showcase: boolean; close: () => void; openChat: () => void }) {
  return (
    <OverlayShell close={close}>
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-7 text-center">
        {[10, 27, 46, 68, 84].map((left, index) => <span key={left} style={{ left: `${left}%`, animationDelay: `${index * 260}ms` }} className="floating-heart text-2xl text-[#F2C94C]">♥</span>)}
        <p className="text-[10px] font-black tracking-[0.35em] text-[#F2C94C]">IT&apos;S A MATCH</p>
        <h1 className="match-pop mt-3 text-4xl font-black tracking-tight">You both chose each other.</h1>
        <p className="mt-3 max-w-[290px] text-sm leading-5 text-white/42">Start with a genuine message and build the connection naturally.</p>
        {showcase && <span className="mt-3 rounded-full bg-blue-400/10 px-3 py-1 text-[9px] font-black text-blue-300">SHOWCASE MATCH · NOT SAVED AS A REAL MEMBER MATCH</span>}
        <div className="match-pop relative mt-9 h-40 w-64">
          <div className="absolute left-2 top-4 h-32 w-32 -rotate-8 overflow-hidden rounded-full border-4 border-[#0b0d12] bg-[#171a21] shadow-2xl"><ProfilePhoto profile={memberProfile} sizes="128px" /></div>
          <div className="absolute right-2 top-4 h-32 w-32 rotate-8 overflow-hidden rounded-full border-4 border-[#F2C94C] bg-[#171a21] shadow-2xl"><ProfilePhoto profile={profile} sizes="128px" /></div>
          <span className="absolute left-1/2 top-1/2 z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#F2C94C] text-xl text-black shadow-xl">♥</span>
        </div>
        <button onClick={openChat} className="mt-8 w-full rounded-2xl bg-[#F2C94C] py-3.5 text-sm font-black text-black">Send a message</button>
        <button onClick={close} className="mt-3 w-full rounded-2xl border border-white/10 py-3 text-sm font-bold text-white/45">Keep discovering</button>
      </div>
    </OverlayShell>
  );
}

function PremiumOverlay({ close, showToast }: { close: () => void; showToast: (text: string) => void }) {
  const features = ["See every incoming like", "Unlimited likes", "Five Super Likes each week", "Monthly profile boost", "Advanced discovery filters", "Priority matching visibility"];
  return (
    <OverlayShell close={close}>
      <div className="app-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-20 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#F2C94C] text-black shadow-[0_0_45px_rgba(242,201,76,.35)]"><DatingIcon name="crown" className="h-8 w-8" /></span>
        <p className="mt-5 text-[10px] font-black tracking-[0.3em] text-[#F2C94C]">AFROLOVE GOLD</p>
        <h1 className="mt-2 text-3xl font-black">Match with more intention.</h1>
        <p className="mx-auto mt-3 max-w-[320px] text-sm leading-5 text-white/42">Premium tools designed to help serious African singles connect with more intention.</p>
        <div className="mt-7 space-y-2 text-left">{features.map((feature) => <div key={feature} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F2C94C]/10 text-[#F2C94C]"><DatingIcon name="check" className="h-4 w-4" /></span><span className="text-sm font-bold text-white/65">{feature}</span></div>)}</div>
        <div className="mt-7 grid grid-cols-3 gap-2"><PriceCard period="1 month" price="US$4.99" /><PriceCard period="3 months" price="US$10.99" featured /><PriceCard period="12 months" price="US$29.99" /></div>
        <button onClick={() => showToast("Regional card and mobile-money checkout is the next payment phase") } className="gold-shine mt-5 w-full rounded-2xl bg-[#F2C94C] py-3.5 text-sm font-black text-black">Continue with Gold</button>
        <p className="mt-3 text-[9px] leading-4 text-white/22">Prototype base pricing for client review. Local currencies will be supported before launch.</p>
      </div>
    </OverlayShell>
  );
}

function PriceCard({ period, price, featured = false }: { period: string; price: string; featured?: boolean }) {
  return <div className={`rounded-2xl border p-3 ${featured ? "border-[#F2C94C] bg-[#F2C94C]/10" : "border-white/10 bg-white/[0.025]"}`}><p className="text-[9px] font-bold text-white/35">{period}</p><p className="mt-2 text-sm font-black text-[#FFE58C]">{price}</p>{featured && <p className="mt-1 text-[7px] font-black text-[#F2C94C]">BEST VALUE</p>}</div>;
}

function NotificationsOverlay({ likes, matches, close }: { likes: number; matches: MatchSummary[]; close: () => void }) {
  const recentMatches = matches.slice(0, 4);
  return (
    <OverlayShell close={close}>
      <div className="app-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-20">
        <AppHeader title="Activity" subtitle="Likes, matches and messages" />
        <div className="mt-6 space-y-3">
          {likes > 0 && <NotificationItem icon="heart" title={`${likes} ${likes === 1 ? "person likes" : "people like"} you`} text="Upgrade to reveal incoming profiles." />}
          {recentMatches.map((match) => <NotificationItem key={match.id} icon="sparkles" title={`You matched with ${match.profile.displayName}`} text={match.lastMessage} />)}
          {!likes && !recentMatches.length && <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center"><DatingIcon name="bell" className="mx-auto h-7 w-7 text-white/20" /><p className="mt-4 text-sm font-bold">No new activity</p><p className="mt-1 text-xs text-white/30">We will notify you when something meaningful happens.</p></div>}
        </div>
      </div>
    </OverlayShell>
  );
}

function NotificationItem({ icon, title, text }: { icon: DatingIconName; title: string; text: string }) {
  return <div className="flex gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F2C94C]/10 text-[#F2C94C]"><DatingIcon name={icon} className="h-5 w-5" /></span><div><p className="text-sm font-black">{title}</p><p className="mt-1 text-[11px] leading-4 text-white/38">{text}</p></div></div>;
}

function SettingsOverlay({ settings, setSettings, close, editProfile, requestVerification, showToast }: { settings: { notifications: boolean; showOnline: boolean; discoveryVisible: boolean }; setSettings: React.Dispatch<React.SetStateAction<{ notifications: boolean; showOnline: boolean; discoveryVisible: boolean }>>; close: () => void; editProfile: () => void; requestVerification: () => void; showToast: (text: string) => void }) {
  return (
    <OverlayShell close={close}>
      <div className="app-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-20">
        <AppHeader title="Settings" subtitle="Privacy, safety and account controls" />
        <div className="mt-6 space-y-2"><SettingToggle label="Push notifications" description="Matches, messages and important activity" value={settings.notifications} onChange={() => setSettings((value) => ({ ...value, notifications: !value.notifications }))} /><SettingToggle label="Show online status" description="Let matches see when you are active" value={settings.showOnline} onChange={() => setSettings((value) => ({ ...value, showOnline: !value.showOnline }))} /><SettingToggle label="Discovery visibility" description="Allow your profile to appear in discovery" value={settings.discoveryVisible} onChange={() => setSettings((value) => ({ ...value, discoveryVisible: !value.discoveryVisible }))} /></div>
        <div className="mt-6 space-y-2"><SettingsButton icon="user" label="Edit dating profile" onClick={editProfile} /><SettingsButton icon="check" label="Request profile verification" onClick={requestVerification} /><SettingsButton icon="shield" label="Safety centre" onClick={() => showToast("Use the three-dot menu in a profile or chat to report, block or unmatch.")} /><SettingsButton icon="ban" label="Blocked members" onClick={() => showToast("Blocked-members management will be expanded in the next member settings release.")} /></div>
        <form action="/auth/signout" method="post" className="mt-6"><button className="w-full rounded-2xl border border-red-400/20 bg-red-400/[0.06] py-3 text-sm font-black text-red-300">Sign out</button></form>
      </div>
    </OverlayShell>
  );
}

function SettingToggle({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: () => void }) {
  return <button onClick={onChange} className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 text-left"><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{label}</span><span className="mt-1 block text-[10px] text-white/32">{description}</span></span><span className={`relative h-6 w-11 rounded-full transition ${value ? "bg-[#F2C94C]" : "bg-white/10"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${value ? "left-6" : "left-1"}`} /></span></button>;
}

function SettingsButton({ icon, label, onClick }: { icon: DatingIconName; label: string; onClick: () => void }) {
  return <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 text-left"><DatingIcon name={icon} className="h-5 w-5 text-white/35" /><span className="flex-1 text-sm font-bold text-white/65">{label}</span><DatingIcon name="chevron" className="h-4 w-4 text-white/20" /></button>;
}

function SafetyOverlay({ profile, matchId, messages, memberId, close, block, report }: { profile: DiscoveryProfile; matchId?: string; messages: MatchMessage[]; memberId: string; close: () => void; block: () => void; report: (draft: SafetyReportDraft) => Promise<void> }) {
  const [category, setCategory] = useState("harassment");
  const [details, setDetails] = useState("");
  const [evidenceScope, setEvidenceScope] = useState<SafetyReportDraft["evidenceScope"]>(matchId ? "last_20" : "profile");
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [blockMember, setBlockMember] = useState(false);
  const [unmatch, setUnmatch] = useState(Boolean(matchId));
  const [submitting, setSubmitting] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const submit = async () => {
    if (evidenceScope === "selected" && selectedMessageIds.length === 0) return;
    setSubmitting(true);
    try {
      await report({ category, details, evidenceScope, selectedMessageIds, blockMember, unmatch });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMessage = (id: string) => setSelectedMessageIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return (
    <OverlayShell close={close}>
      <div className="app-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-20">
        <div className="text-center"><SmallAvatar profile={profile} size="mx-auto h-20 w-20" /><h1 className="mt-4 text-2xl font-black">Safety options</h1><p className="mt-1 text-sm text-white/38">Manage your experience with {profile.displayName}.</p></div>
        {!showReport ? (
          <div className="mt-8 space-y-3"><button onClick={() => setShowReport(true)} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-left"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-400/10 text-orange-300"><DatingIcon name="flag" /></span><span><span className="block text-sm font-black">{matchId ? "Report conversation" : "Report profile"}</span><span className="mt-1 block text-[10px] text-white/35">{matchId ? "Choose exactly which chat evidence the safety team may review." : "Send confidential profile details to moderation."}</span></span></button><button onClick={block} className="flex w-full items-center gap-3 rounded-2xl border border-red-400/15 bg-red-400/[0.045] p-4 text-left"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-400/10 text-red-300"><DatingIcon name="ban" /></span><span><span className="block text-sm font-black text-red-200">Block member</span><span className="mt-1 block text-[10px] text-red-100/35">Remove each other from discovery and matches.</span></span></button><div className="rounded-2xl border border-blue-400/15 bg-blue-400/[0.05] p-4 text-[11px] leading-5 text-blue-100/50"><strong className="text-blue-100/75">Privacy promise:</strong> Moderators cannot casually browse private chats. They only receive the specific evidence you submit with a report.</div></div>
        ) : (
          <div className="mt-8">
            <label className="text-xs font-bold text-white/55">What happened?</label>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="profile-input mt-2">{reportOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            {matchId && <><label className="mt-5 block text-xs font-bold text-white/55">Conversation evidence shared with the safety team</label><div className="mt-2 grid gap-2"><button onClick={() => setEvidenceScope("selected")} className={`rounded-2xl border p-3 text-left text-xs font-bold ${evidenceScope === "selected" ? "border-[#F2C94C]/60 bg-[#F2C94C]/10" : "border-white/10 bg-white/[0.03]"}`}>Selected messages only</button><button onClick={() => setEvidenceScope("last_20")} className={`rounded-2xl border p-3 text-left text-xs font-bold ${evidenceScope === "last_20" ? "border-[#F2C94C]/60 bg-[#F2C94C]/10" : "border-white/10 bg-white/[0.03]"}`}>Last 20 messages</button><button onClick={() => setEvidenceScope("full_conversation")} className={`rounded-2xl border p-3 text-left text-xs font-bold ${evidenceScope === "full_conversation" ? "border-[#F2C94C]/60 bg-[#F2C94C]/10" : "border-white/10 bg-white/[0.03]"}`}>Full available conversation <span className="text-white/30">(up to 300 recent messages)</span></button></div></>}
            {matchId && evidenceScope === "selected" && <div className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3">{messages.map((item) => { const checked = selectedMessageIds.includes(item.id); return <button key={item.id} onClick={() => toggleMessage(item.id)} className={`flex w-full gap-3 rounded-xl border p-3 text-left ${checked ? "border-[#F2C94C]/60 bg-[#F2C94C]/10" : "border-white/[0.06] bg-white/[0.025]"}`}><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${checked ? "border-[#F2C94C] bg-[#F2C94C] text-black" : "border-white/20"}`}>{checked ? "✓" : ""}</span><span><span className="block text-[9px] font-black text-white/35">{item.senderId === memberId ? "You" : profile.displayName}</span><span className="mt-1 block text-xs leading-5 text-white/70">{item.body}</span></span></button>; })}{!messages.length && <p className="py-5 text-center text-xs text-white/30">No loaded messages are available to select. Choose “Last 20 messages” instead.</p>}</div>}
            <label className="mt-5 block text-xs font-bold text-white/55">Explain the concern</label><textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={2000} rows={5} placeholder="Describe the rude, racist, threatening, sexual, fraudulent or unwanted business behaviour..." className="profile-input mt-2 resize-none" />
            {matchId && <div className="mt-4 space-y-2"><label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs font-bold"><input type="checkbox" checked={unmatch} onChange={(event) => setUnmatch(event.target.checked)} className="h-4 w-4 accent-[#F2C94C]" />Unmatch and close this conversation after reporting</label><label className="flex items-center gap-3 rounded-2xl border border-red-400/15 bg-red-400/[0.04] p-3 text-xs font-bold text-red-100/70"><input type="checkbox" checked={blockMember} onChange={(event) => { setBlockMember(event.target.checked); if (event.target.checked) setUnmatch(true); }} className="h-4 w-4 accent-red-400" />Block this member immediately</label></div>}
            <button disabled={submitting || (evidenceScope === "selected" && selectedMessageIds.length === 0)} onClick={() => void submit()} className="mt-5 w-full rounded-2xl bg-orange-400 py-3 text-sm font-black text-black disabled:opacity-40">{submitting ? "Submitting securely..." : "Submit confidential safety report"}</button><button onClick={() => setShowReport(false)} className="mt-2 w-full py-2 text-xs font-bold text-white/35">Back</button>
          </div>
        )}
      </div>
    </OverlayShell>
  );
}
