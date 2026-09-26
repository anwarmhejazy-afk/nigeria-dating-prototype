import { redirect } from "next/navigation";
import { HistoryScreen, type HistoryEntry } from "@/components/dating/history-screen";
import { toDiscoveryProfile } from "@/lib/matching";
import { toMemberProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

type InteractionRow = {
  target_id: string;
  action: "like" | "super_like" | "pass";
  updated_at: string;
};

export default async function HistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/history");
  }

  const { data: currentProfileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!currentProfileData) {
    redirect("/onboarding");
  }

  const currentProfile = toMemberProfile(
    currentProfileData as Record<string, unknown>,
  );

  const { data: interactionData, error: interactionError } = await supabase
    .from("interactions")
    .select("target_id,action,updated_at")
    .eq("actor_id", user.id)
    .in("action", ["like", "super_like", "pass"])
    .order("updated_at", { ascending: false });

  if (interactionError) {
    console.error("Unable to load interaction history:", interactionError);
  }

  const interactions = (interactionData || []) as InteractionRow[];
  const targetIds = Array.from(
    new Set(interactions.map((item) => item.target_id).filter(Boolean)),
  );

  let profileRows: Record<string, unknown>[] = [];

  if (targetIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .in("id", targetIds);

    if (profilesError) {
      console.error("Unable to load history profiles:", profilesError);
    } else {
      profileRows = (profilesData || []) as Record<string, unknown>[];
    }
  }

  const profilesById = new Map(
    profileRows.map((row) => [String(row.id || ""), row]),
  );

  const entries: HistoryEntry[] = interactions.flatMap((interaction) => {
    const row = profilesById.get(interaction.target_id);
    if (!row) return [];

    return [
      {
        action: interaction.action,
        updatedAt: interaction.updated_at,
        profile: toDiscoveryProfile(row, currentProfile),
      },
    ];
  });

  return <HistoryScreen entries={entries} />;
}
