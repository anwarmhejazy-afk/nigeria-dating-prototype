import type { SupabaseClient } from "@supabase/supabase-js";
import { profiles as showcaseData } from "@/app/data";
import {
  calculateAge,
  type MemberProfile,
  toMemberProfile,
} from "@/lib/profile";

export type InteractionAction = "like" | "pass" | "super_like";
export type ProfileSource = "member" | "showcase";

export type DiscoveryProfile = {
  id: string;
  source: ProfileSource;
  displayName: string;
  age: number | null;
  city: string;
  state: string;
  country: string;
  tribe: string;
  occupation: string;
  education: string;
  religion: string;
  height: string;
  languages: string[];
  interests: string[];
  bio: string;
  lookingFor: string;
  relationshipGoal: string;
  lifestyle: string;
  photos: string[];
  avatarUrl: string | null;
  verified: boolean;
  online: boolean;
  joinedLabel: string;
  proximityLabel: string;
  compatibility: number;
  membershipPlan: "free" | "premium" | "vip";
  boosted: boolean;
};

export type MatchMessage = {
  id: string;
  matchId: string;
  senderId: string;
  body: string;
  messageType: "text" | "image" | "voice";
  mediaUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

export type MatchSummary = {
  id: string;
  source: ProfileSource;
  profile: DiscoveryProfile;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
};

export type MatchingInitialData = {
  candidates: DiscoveryProfile[];
  matches: MatchSummary[];
  incomingLikes: DiscoveryProfile[];
  incomingLikeCount: number;
  showcaseMode: boolean;
  passRecycleHours: number;
};

type ProfileRow = Record<string, unknown>;
type MatchRow = {
  id: string;
  user_low: string;
  user_high: string;
  created_at: string;
  last_message_at: string;
  is_active: boolean;
};

type MessageRow = {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  message_type: "text" | "image" | "voice";
  media_url: string | null;
  read_at: string | null;
  created_at: string;
};

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function humanActivityLabel(row: ProfileRow) {
  if (Boolean(row.is_online)) return "Active now";

  const lastSeen = stringValue(row.last_seen);
  if (!lastSeen) return "Recently active";

  const difference = Date.now() - new Date(lastSeen).getTime();
  if (!Number.isFinite(difference) || difference < 0) return "Recently active";

  const minutes = Math.floor(difference / 60_000);
  if (minutes < 60) return `Active ${Math.max(minutes, 1)}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Active ${hours}h ago`;

  const days = Math.floor(hours / 24);
  return days <= 7 ? `Active ${days}d ago` : "Active recently";
}

function preferenceAccepts(showMe: string | null, gender: string | null) {
  if (!showMe || showMe === "Everyone") return true;
  if (!gender) return false;
  if (showMe === "Men") return gender === "Man";
  if (showMe === "Women") return gender === "Woman";
  return true;
}

function profileCompatibility(current: MemberProfile, candidate: MemberProfile) {
  let score = 56;
  const currentInterests = new Set(
    current.interests.map((interest) => interest.toLowerCase()),
  );
  const sharedInterests = candidate.interests.filter((interest) =>
    currentInterests.has(interest.toLowerCase()),
  ).length;

  score += Math.min(sharedInterests * 6, 24);

  if (
    current.city &&
    candidate.city &&
    current.city.toLowerCase() === candidate.city.toLowerCase()
  ) {
    score += 10;
  } else if (
    current.state &&
    candidate.state &&
    current.state.toLowerCase() === candidate.state.toLowerCase()
  ) {
    score += 6;
  }

  if (
    current.relationship_goal &&
    candidate.relationship_goal &&
    current.relationship_goal === candidate.relationship_goal
  ) {
    score += 7;
  }

  if (
    current.religion &&
    candidate.religion &&
    current.religion === candidate.religion
  ) {
    score += 4;
  }

  return Math.min(score, 98);
}

function proximityLabel(current: MemberProfile, candidate: MemberProfile) {
  if (
    current.city &&
    candidate.city &&
    current.city.toLowerCase() === candidate.city.toLowerCase()
  ) {
    return `Nearby in ${candidate.city}`;
  }

  if (
    current.state &&
    candidate.state &&
    current.state.toLowerCase() === candidate.state.toLowerCase()
  ) {
    return `Also in ${candidate.state}`;
  }

  return candidate.city
    ? `${candidate.city}, ${candidate.state || candidate.country}`
    : candidate.state || candidate.country;
}

function lifestyleLabel(profile: MemberProfile) {
  const values = [
    profile.lifestyle.exercise,
    profile.lifestyle.drinking,
    profile.lifestyle.smoking,
  ].filter((value) => value && value !== "Prefer not to say");

  return values.slice(0, 3).join(" · ") || "Lifestyle details available";
}

export function toDiscoveryProfile(
  row: ProfileRow,
  currentProfile: MemberProfile,
  entitlement: { plan: "free" | "premium" | "vip"; boosted: boolean } = { plan: "free", boosted: false },
): DiscoveryProfile {
  const profile = toMemberProfile(row);
  const photos = Array.from(
    new Set(
      [...profile.photo_urls, profile.avatar_url]
        .filter((value): value is string => Boolean(value))
        .slice(0, 4),
    ),
  );

  return {
    id: profile.id,
    source: "member",
    displayName: profile.display_name || "AfroLove Member",
    age: calculateAge(profile.date_of_birth),
    city: profile.city || profile.country || "Africa",
    state: profile.state || "",
    country: profile.country || "Africa",
    tribe: profile.tribe || "African heritage",
    occupation: profile.occupation || "Member",
    education: profile.education || "Not specified",
    religion: profile.religion || "Not specified",
    height: profile.height_cm ? `${profile.height_cm} cm` : "Not specified",
    languages: profile.languages,
    interests: profile.interests,
    bio: profile.bio || "Ready to make a genuine connection.",
    lookingFor: profile.looking_for || "A genuine connection",
    relationshipGoal: profile.relationship_goal || "Dating with intention",
    lifestyle: lifestyleLabel(profile),
    photos,
    avatarUrl: profile.avatar_url || photos[0] || null,
    verified: profile.is_verified,
    online: profile.is_online,
    joinedLabel: humanActivityLabel(row),
    proximityLabel: proximityLabel(currentProfile, profile),
    compatibility: profileCompatibility(currentProfile, profile),
    membershipPlan: entitlement.plan,
    boosted: entitlement.boosted,
  };
}

export function showcaseProfiles(): DiscoveryProfile[] {
  return showcaseData.map((profile) => ({
    id: `showcase-${profile.id}`,
    source: "showcase",
    displayName: profile.name,
    age: profile.age,
    city: profile.location,
    state: "",
    country: profile.country,
    tribe: profile.tribe,
    occupation: profile.occupation,
    education: profile.education,
    religion: profile.religion,
    height: profile.height,
    languages: profile.languages,
    interests: profile.interests,
    bio: profile.bio,
    lookingFor: profile.lookingFor,
    relationshipGoal: profile.lookingFor,
    lifestyle: profile.lifestyle,
    photos: [profile.image],
    avatarUrl: profile.image,
    verified: profile.verified,
    online: profile.online,
    joinedLabel: profile.joined,
    proximityLabel: `${profile.location}, ${profile.country}`,
    compatibility: profile.compatibility,
    membershipPlan: "free",
    boosted: false,
  }));
}

function profileMatchesPreferences(
  current: MemberProfile,
  candidate: MemberProfile,
) {
  return (
    preferenceAccepts(current.show_me, candidate.gender) &&
    preferenceAccepts(candidate.show_me, current.gender)
  );
}

function profileMap(rows: ProfileRow[]) {
  return new Map(rows.map((row) => [stringValue(row.id), row]));
}

export function toMatchMessage(row: MessageRow): MatchMessage {
  return {
    id: row.id,
    matchId: row.match_id,
    senderId: row.sender_id,
    body: row.body,
    messageType: row.message_type,
    mediaUrl: row.media_url,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function getMatchSummary(
  supabase: SupabaseClient,
  matchId: string,
  userId: string,
  currentProfile: MemberProfile,
): Promise<MatchSummary | null> {
  const { data: matchData, error: matchError } = await supabase
    .from("matches")
    .select("id,user_low,user_high,is_active,created_at,last_message_at")
    .eq("id", matchId)
    .eq("is_active", true)
    .maybeSingle();

  if (matchError || !matchData) return null;

  const match = matchData as MatchRow;
  const otherId = match.user_low === userId ? match.user_high : match.user_low;

  const [{ data: profileData }, { data: messageData }, { count: unreadCount }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", otherId).maybeSingle(),
      supabase
        .from("messages")
        .select("body,created_at")
        .eq("match_id", matchId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("match_id", matchId)
        .neq("sender_id", userId)
        .is("read_at", null),
    ]);

  if (!profileData) return null;

  const profile = toDiscoveryProfile(profileData as ProfileRow, currentProfile);

  return {
    id: match.id,
    source: "member",
    profile,
    lastMessage: stringValue(messageData?.body, "You matched — say hello 👋"),
    lastMessageAt: stringValue(messageData?.created_at, match.last_message_at),
    unreadCount: unreadCount || 0,
    createdAt: match.created_at,
  };
}

export async function loadMatchingInitialData(
  supabase: SupabaseClient,
  userId: string,
  currentProfile: MemberProfile,
): Promise<MatchingInitialData> {
  const [outgoingResult, candidateResult, matchResult, incomingResult, settingsResult] =
    await Promise.all([
      supabase
        .from("interactions")
        .select("target_id,action,updated_at")
        .eq("actor_id", userId),
      supabase
        .from("profiles")
        .select("*")
        .neq("id", userId)
        .eq("onboarding_completed", true)
        .eq("profile_visibility", "visible")
        .order("last_seen", { ascending: false })
        .limit(60),
      supabase
        .from("matches")
        .select("id,user_low,user_high,is_active,created_at,last_message_at")
        .eq("is_active", true)
        .or(`user_low.eq.${userId},user_high.eq.${userId}`)
        .order("last_message_at", { ascending: false }),
      supabase
        .from("interactions")
        .select("actor_id,action,created_at")
        .eq("target_id", userId)
        .in("action", ["like", "super_like"])
        .order("created_at", { ascending: false }),
      supabase.rpc("get_discovery_configuration"),
    ]);

  const passRecycleHours = Math.max(
    1,
    Number((settingsResult.data as { passRecycleHours?: number } | null)?.passRecycleHours || 24),
  );
  const passCutoff = Date.now() - passRecycleHours * 60 * 60 * 1000;
  const excludedIds = new Set(
    (outgoingResult.data || [])
      .filter((row) => {
        const action = String(row.action || "");
        if (action === "like" || action === "super_like") return true;
        if (action !== "pass") return false;
        const updatedAt = new Date(String(row.updated_at || "")).getTime();
        return Number.isFinite(updatedAt) && updatedAt >= passCutoff;
      })
      .map((row) => String(row.target_id)),
  );

  const candidateRows = (candidateResult.data || []) as ProfileRow[];
  const candidateIds = candidateRows.map((row) => String(row.id));
  const { data: entitlementRows } = candidateIds.length
    ? await supabase.rpc("get_discovery_entitlements", {
        p_candidate_ids: candidateIds,
      })
    : { data: [] as { user_id: string; plan_slug: string; boosted: boolean }[] };

  const entitlementMap = new Map(
    ((entitlementRows || []) as { user_id: string; plan_slug: string; boosted: boolean }[]).map((row) => [
      String(row.user_id),
      {
        plan:
          row.plan_slug === "vip"
            ? ("vip" as const)
            : row.plan_slug === "premium"
              ? ("premium" as const)
              : ("free" as const),
        boosted: Boolean(row.boosted),
      },
    ]),
  );

  const liveCandidates = candidateRows
    .map((row) => toMemberProfile(row))
    .filter((candidate) => !excludedIds.has(candidate.id))
    .filter((candidate) => profileMatchesPreferences(currentProfile, candidate))
    .map((candidate) => {
      const original = candidateRows.find((row) => row.id === candidate.id) || {};
      return toDiscoveryProfile(
        original,
        currentProfile,
        entitlementMap.get(candidate.id) || { plan: "free", boosted: false },
      );
    })
    .sort((first, second) => {
      const firstPriority = first.boosted ? 3 : first.membershipPlan === "vip" ? 2 : 0;
      const secondPriority = second.boosted ? 3 : second.membershipPlan === "vip" ? 2 : 0;
      return secondPriority - firstPriority || second.compatibility - first.compatibility;
    })
    .slice(0, 30);

  const matchRows = (matchResult.data || []) as MatchRow[];
  const matchOtherIds = matchRows.map((match) =>
    match.user_low === userId ? match.user_high : match.user_low,
  );

  const incomingRows = incomingResult.data || [];
  const incomingActorIds = incomingRows.map((row) => String(row.actor_id));
  const profileIds = Array.from(new Set([...matchOtherIds, ...incomingActorIds]));

  const [{ data: relatedProfiles }, { data: recentMessages }, { data: unreadRows }] =
    await Promise.all([
      profileIds.length
        ? supabase.from("profiles").select("*").in("id", profileIds)
        : Promise.resolve({ data: [] as ProfileRow[] }),
      matchRows.length
        ? supabase
            .from("messages")
            .select("id,match_id,sender_id,body,message_type,media_url,read_at,created_at")
            .in(
              "match_id",
              matchRows.map((match) => match.id),
            )
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as MessageRow[] }),
      matchRows.length
        ? supabase
            .from("messages")
            .select("match_id,sender_id,read_at")
            .in(
              "match_id",
              matchRows.map((match) => match.id),
            )
            .neq("sender_id", userId)
            .is("read_at", null)
        : Promise.resolve({ data: [] as { match_id: string }[] }),
    ]);

  const relatedMap = profileMap((relatedProfiles || []) as ProfileRow[]);
  const lastMessageMap = new Map<string, MessageRow>();

  for (const row of (recentMessages || []) as MessageRow[]) {
    if (!lastMessageMap.has(row.match_id)) lastMessageMap.set(row.match_id, row);
  }

  const unreadMap = new Map<string, number>();
  for (const row of unreadRows || []) {
    const matchId = String(row.match_id);
    unreadMap.set(matchId, (unreadMap.get(matchId) || 0) + 1);
  }

  const matches = matchRows
    .map((match): MatchSummary | null => {
      const otherId = match.user_low === userId ? match.user_high : match.user_low;
      const row = relatedMap.get(otherId);
      if (!row) return null;
      const message = lastMessageMap.get(match.id);
      return {
        id: match.id,
        source: "member",
        profile: toDiscoveryProfile(row, currentProfile),
        lastMessage: message?.body || "You matched — say hello 👋",
        lastMessageAt: message?.created_at || match.last_message_at,
        unreadCount: unreadMap.get(match.id) || 0,
        createdAt: match.created_at,
      };
    })
    .filter((match): match is MatchSummary => Boolean(match));

  const matchedIds = new Set(matchOtherIds);
  const incomingLikes = incomingActorIds
    .filter((actorId) => !matchedIds.has(actorId))
    .map((actorId) => relatedMap.get(actorId))
    .filter((row): row is ProfileRow => Boolean(row))
    .map((row) => toDiscoveryProfile(row, currentProfile));

  const showcaseMode = liveCandidates.length === 0;

  return {
    candidates: showcaseMode ? showcaseProfiles() : liveCandidates,
    matches,
    incomingLikes,
    incomingLikeCount: incomingLikes.length,
    showcaseMode,
    passRecycleHours,
  };
}
