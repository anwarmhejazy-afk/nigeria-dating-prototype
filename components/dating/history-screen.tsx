"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { DiscoveryProfile } from "@/lib/matching";

export type HistoryEntry = {
  action: "like" | "super_like" | "pass";
  updatedAt: string;
  profile: DiscoveryProfile;
};

type HistoryTab = "liked" | "passed";

function profileTitle(profile: DiscoveryProfile) {
  return [profile.displayName, profile.age].filter(Boolean).join(", ");
}

function actionLabel(action: HistoryEntry["action"]) {
  if (action === "super_like") return "Super Like";
  if (action === "like") return "Liked";
  return "Passed";
}

function formattedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(date);
}

function HistoryPhoto({ profile }: { profile: DiscoveryProfile }) {
  const source = profile.photos[0] || profile.avatarUrl;

  if (!source) {
    const initials = profile.displayName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");

    return (
      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#806821,#1a1d24_58%,#0d0f14)] text-3xl font-black text-[#FFE58C]">
        {initials || "AL"}
      </div>
    );
  }

  return (
    <Image
      src={source}
      alt={`${profile.displayName}'s profile`}
      fill
      sizes="(max-width: 640px) 45vw, 220px"
      className="object-cover"
    />
  );
}

export function HistoryScreen({ entries }: { entries: HistoryEntry[] }) {
  const [tab, setTab] = useState<HistoryTab>("liked");

  const liked = useMemo(
    () => entries.filter((entry) => entry.action === "like" || entry.action === "super_like"),
    [entries],
  );

  const passed = useMemo(
    () => entries.filter((entry) => entry.action === "pass"),
    [entries],
  );

  const visible = tab === "liked" ? liked : passed;

  return (
    <main className="min-h-screen bg-[#0d0f14] text-white">
      <div className="mx-auto min-h-screen w-full max-w-[680px] border-x border-white/[0.05] bg-[#0d0f14]">
        <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#0d0f14]/95 px-5 pb-4 pt-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Link
              href="/app?tab=profile"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-lg text-white/70 transition hover:bg-white/[0.07]"
              aria-label="Back to profile"
            >
              ‹
            </Link>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#F2C94C]">
                YOUR ACTIVITY
              </p>
              <h1 className="mt-1 text-2xl font-black">History</h1>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-1">
            <button
              type="button"
              onClick={() => setTab("liked")}
              className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${
                tab === "liked"
                  ? "bg-[#F2C94C] text-black"
                  : "text-white/45 hover:text-white"
              }`}
            >
              Liked
              <span className="ml-2 text-xs opacity-70">{liked.length}</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("passed")}
              className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${
                tab === "passed"
                  ? "bg-[#F2C94C] text-black"
                  : "text-white/45 hover:text-white"
              }`}
            >
              Passed
              <span className="ml-2 text-xs opacity-70">{passed.length}</span>
            </button>
          </div>
        </header>

        <section className="px-5 pb-10 pt-5">
          {visible.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {visible.map((entry) => (
                <article
                  key={`${entry.profile.id}-${entry.action}`}
                  className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-white/[0.025]"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#171a20]">
                    <HistoryPhoto profile={entry.profile} />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent px-3 pb-3 pt-10">
                      <div className="flex items-center gap-1.5">
                        <h2 className="min-w-0 truncate text-sm font-black">
                          {profileTitle(entry.profile)}
                        </h2>
                        {entry.profile.verified && (
                          <span
                            title="Verified"
                            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-400 text-[9px] font-black text-white"
                          >
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-[10px] text-white/55">
                        {[entry.profile.city, entry.profile.country].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>

                  <div className="p-3">
                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${
                        entry.action === "super_like"
                          ? "bg-blue-400/10 text-blue-300"
                          : entry.action === "like"
                            ? "bg-[#F2C94C]/10 text-[#FFE58C]"
                            : "bg-white/[0.06] text-white/45"
                      }`}
                    >
                      {entry.action === "super_like" ? "★ " : entry.action === "like" ? "♥ " : "× "}
                      {actionLabel(entry.action)}
                    </span>
                    <p className="mt-2 text-[9px] text-white/28">
                      {formattedDate(entry.updatedAt)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mx-auto mt-14 max-w-[300px] text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-3xl text-white/20">
                {tab === "liked" ? "♥" : "×"}
              </div>
              <h2 className="mt-5 text-xl font-black">
                {tab === "liked" ? "No liked profiles yet" : "No passed profiles yet"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/38">
                {tab === "liked"
                  ? "Profiles you Like or Super Like will appear here."
                  : "Profiles you pass on will appear here."}
              </p>
              <Link
                href="/app?tab=discover"
                className="mt-6 inline-flex rounded-2xl bg-[#F2C94C] px-5 py-3 text-sm font-black text-black"
              >
                Open Discover
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
