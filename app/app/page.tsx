"use client";

import Image from "next/image";
import type { PointerEvent as ReactPointerEvent, SVGProps } from "react";
import { useMemo, useState } from "react";
import { notifications, profiles, type Profile } from "../data";

type MainTab = "home" | "discover" | "likes" | "chat" | "profile";
type Overlay =
  | "match"
  | "details"
  | "notifications"
  | "premium"
  | "settings"
  | null;
type IconName =
  | "home"
  | "discover"
  | "heart"
  | "chat"
  | "user"
  | "bell"
  | "search"
  | "filter"
  | "undo"
  | "x"
  | "star"
  | "back"
  | "settings"
  | "pin"
  | "check"
  | "crown"
  | "sparkles"
  | "send"
  | "image"
  | "mic"
  | "smile"
  | "more"
  | "shield"
  | "chevron";

const iconPaths: Record<IconName, React.ReactNode> = {
  home: <><path d="m3 10.8 9-7.2 9 7.2"/><path d="M5.5 9.6V21h13V9.6"/><path d="M9.5 21v-6h5v6"/></>,
  discover: <><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z"/></>,
  heart: <path d="M20.8 4.9a5.5 5.5 0 0 0-7.8 0L12 6l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.3 1-1a5.5 5.5 0 0 0 0-7.8Z"/>,
  chat: <><path d="M21 14a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  filter: <><path d="M4 6h16M7 12h10M10 18h4"/></>,
  undo: <><path d="M9 7 4 12l5 5"/><path d="M5 12h8a6 6 0 0 1 6 6"/></>,
  x: <><path d="m6 6 12 12M18 6 6 18"/></>,
  star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>,
  back: <><path d="m15 18-6-6 6-6"/><path d="M9 12h10"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  crown: <><path d="m3 7 4.5 4L12 4l4.5 7L21 7l-2 11H5L3 7Z"/><path d="M5 21h14"/></>,
  sparkles: <><path d="m12 3 1.2 3.2L16 7.5l-2.8 1.3L12 12l-1.2-3.2L8 7.5l2.8-1.3L12 3Z"/><path d="m19 13 .8 2.2L22 16l-2.2.8L19 19l-.8-2.2L16 16l2.2-.8L19 13ZM5 13l.8 2.2L8 16l-2.2.8L5 19l-.8-2.2L2 16l2.2-.8L5 13Z"/></>,
  send: <><path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/></>,
  mic: <><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/></>,
  smile: <><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>,
};

function Icon({ name, className = "h-5 w-5", ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {iconPaths[name]}
    </svg>
  );
}

const navItems: { id: MainTab; label: string; icon: IconName }[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "discover", label: "Discover", icon: "discover" },
  { id: "likes", label: "Likes", icon: "heart" },
  { id: "chat", label: "Chat", icon: "chat" },
  { id: "profile", label: "Profile", icon: "user" },
];

export default function Home() {
  const [tab, setTab] = useState<MainTab>("home");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState<Profile>(profiles[0]);
  const [matchProfile, setMatchProfile] = useState<Profile>(profiles[0]);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [history, setHistory] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [chatProfile, setChatProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState("");
  const [sentMessages, setSentMessages] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [settings, setSettings] = useState({ notifications: true, darkMode: true, distance: true });

  const current = profiles[currentIndex % profiles.length];
  const next = profiles[(currentIndex + 1) % profiles.length];
  const third = profiles[(currentIndex + 2) % profiles.length];

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return profiles;
    return profiles.filter((profile) =>
      [profile.name, profile.location, profile.tribe, ...profile.interests]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [search]);

  const showToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 2200);
  };

  const openDetails = (profile: Profile) => {
    setSelectedProfile(profile);
    setOverlay("details");
  };

  const finishSwipe = (direction: "left" | "right" | "super") => {
    const swiped = current;
    setHistory((previous) => [...previous.slice(-7), currentIndex]);
    setCurrentIndex((previous) => (previous + 1) % profiles.length);
    setDrag({ x: 0, y: 0 });
    setAnimating(false);

    if (direction === "right") {
      setMatchProfile(swiped);
      setOverlay("match");
    }

    if (direction === "super") {
      showToast(`Super Like sent to ${swiped.name}`);
    }
  };

  const swipe = (direction: "left" | "right" | "super") => {
    if (animating) return;
    setDragging(false);
    setAnimating(true);
    setDrag(
      direction === "left"
        ? { x: -520, y: 42 }
        : direction === "right"
          ? { x: 520, y: 42 }
          : { x: 0, y: -620 },
    );
    window.setTimeout(() => finishSwipe(direction), 290);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (animating) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging || animating) return;
    setDrag((previous) => ({
      x: previous.x + event.movementX,
      y: Math.max(-130, Math.min(100, previous.y + event.movementY)),
    }));
  };

  const onPointerUp = () => {
    if (!dragging || animating) return;
    setDragging(false);
    if (drag.x > 105) return swipe("right");
    if (drag.x < -105) return swipe("left");
    if (drag.y < -95) return swipe("super");
    setDrag({ x: 0, y: 0 });
  };

  const undoSwipe = () => {
    const previousIndex = history.at(-1);
    if (previousIndex === undefined) {
      showToast("Nothing to undo yet");
      return;
    }
    setCurrentIndex(previousIndex);
    setHistory((previous) => previous.slice(0, -1));
    showToast("Last profile restored");
  };

  const openChat = (profile: Profile) => {
    setChatProfile(profile);
    setTab("chat");
    setOverlay(null);
  };

  const sendMessage = () => {
    const clean = message.trim();
    if (!clean) return;
    setSentMessages((previous) => [...previous, clean]);
    setMessage("");
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-0 sm:p-4">
      <section className="relative flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-[#0d0f14] shadow-[0_0_100px_rgba(242,201,76,0.18)] sm:h-[min(860px,calc(100vh-32px))] sm:rounded-[38px] sm:border sm:border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(242,201,76,0.16),transparent_31%),radial-gradient(circle_at_bottom_left,rgba(77,163,255,0.07),transparent_32%)]" />

        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          {tab === "home" && <HomeScreen search={search} setSearch={setSearch} filteredProfiles={filteredProfiles} openDetails={openDetails} setTab={setTab} setOverlay={setOverlay} />}
          {tab === "discover" && <DiscoverScreen current={current} next={next} third={third} drag={drag} dragging={dragging} animating={animating} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} swipe={swipe} undoSwipe={undoSwipe} openDetails={openDetails} setOverlay={setOverlay} />}
          {tab === "likes" && <LikesScreen setOverlay={setOverlay} openDetails={openDetails} />}
          {tab === "chat" && <ChatScreen chatProfile={chatProfile} setChatProfile={setChatProfile} message={message} setMessage={setMessage} sentMessages={sentMessages} sendMessage={sendMessage} showToast={showToast} />}
          {tab === "profile" && <ProfileScreen setOverlay={setOverlay} showToast={showToast} />}
        </div>

        {!overlay && !(tab === "chat" && chatProfile) && (
          <BottomNav tab={tab} setTab={(nextTab) => { setTab(nextTab); setChatProfile(null); }} />
        )}

        {overlay === "match" && <MatchOverlay profile={matchProfile} close={() => setOverlay(null)} openChat={() => openChat(matchProfile)} />}
        {overlay === "details" && <DetailsOverlay profile={selectedProfile} close={() => setOverlay(null)} like={() => { setMatchProfile(selectedProfile); setOverlay("match"); }} openChat={() => openChat(selectedProfile)} />}
        {overlay === "notifications" && <NotificationsOverlay close={() => setOverlay(null)} />}
        {overlay === "premium" && <PremiumOverlay close={() => setOverlay(null)} showToast={showToast} />}
        {overlay === "settings" && <SettingsOverlay close={() => setOverlay(null)} settings={settings} setSettings={setSettings} showToast={showToast} />}

        {toast && (
          <div className="absolute inset-x-5 bottom-24 z-[80] rounded-2xl border border-[#F2C94C]/25 bg-[#1c1b16]/95 px-4 py-3 text-center text-sm font-bold text-[#FFE58C] shadow-2xl backdrop-blur-xl">
            {toast}
          </div>
        )}
      </section>
    </main>
  );
}

function HomeScreen({ search, setSearch, filteredProfiles, openDetails, setTab, setOverlay }: { search: string; setSearch: (value: string) => void; filteredProfiles: Profile[]; openDetails: (profile: Profile) => void; setTab: (tab: MainTab) => void; setOverlay: (overlay: Overlay) => void; }) {
  return (
    <div className="app-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-5">
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-black tracking-[0.34em] text-[#F2C94C]">NAIJA MATCH</p>
            <span className="rounded-full border border-red-400/25 bg-red-400/10 px-2 py-0.5 text-[8px] font-black tracking-wider text-red-300">DEMO</span>
          </div>
          <h1 className="mt-1 text-[27px] font-black tracking-tight">Find your person.</h1>
          <p className="mt-0.5 text-xs text-white/45">Good evening — Lagos is matching.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setOverlay("notifications")} className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-white/80">
            <Icon name="bell" />
            <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#111318] bg-[#EB5757]" />
          </button>
          <button onClick={() => setTab("profile")} className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#F2C94C] to-[#b8860b] text-sm font-black text-black shadow-[0_0_22px_rgba(242,201,76,0.2)]">CM</button>
        </div>
      </header>

      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3.5">
        <Icon name="search" className="h-5 w-5 text-white/35" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, city or interest" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30" />
        <button onClick={() => setTab("discover")} className="text-[#F2C94C]"><Icon name="filter" className="h-5 w-5" /></button>
      </div>

      <section className="mt-5">
        <div className="mb-3 flex items-end justify-between">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">Stories</p><h2 className="mt-0.5 text-lg font-black">Active now</h2></div>
          <button onClick={() => setTab("discover")} className="text-xs font-bold text-[#F2C94C]">View all</button>
        </div>
        <div className="app-scroll -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
          {profiles.slice(0, 6).map((profile) => (
            <button key={profile.id} onClick={() => openDetails(profile)} className="min-w-[68px] text-center">
              <div className="relative mx-auto h-[66px] w-[66px] rounded-full bg-gradient-to-br from-[#F2C94C] via-[#ff9f43] to-[#EB5757] p-[2px]">
                <div className="relative h-full w-full overflow-hidden rounded-full border-[3px] border-[#0d0f14]"><Image src={profile.image} alt={profile.name} fill sizes="66px" className="object-cover" /></div>
                {profile.online && <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-[#0d0f14] bg-emerald-400" />}
              </div>
              <p className="mt-1.5 truncate text-[11px] font-bold text-white/80">{profile.name}</p>
            </button>
          ))}
        </div>
      </section>

      <button onClick={() => setOverlay("premium")} className="gold-shine mt-5 w-full rounded-[24px] bg-gradient-to-r from-[#F2C94C] via-[#FFE58C] to-[#D9A820] p-[1px] text-left shadow-[0_16px_40px_rgba(242,201,76,0.16)]">
        <div className="relative overflow-hidden rounded-[23px] bg-[#19170f] px-5 py-4">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#F2C94C]/15 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F2C94C] text-black"><Icon name="crown" /></div>
              <div><p className="text-sm font-black text-[#FFE58C]">NAIJA MATCH GOLD</p><p className="mt-0.5 text-[11px] text-white/50">See likes, boost visibility and match faster.</p></div>
            </div>
            <Icon name="chevron" className="h-5 w-5 text-[#F2C94C]" />
          </div>
        </div>
      </button>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">Curated for you</p><h2 className="mt-0.5 text-xl font-black">Top Picks</h2></div>
          <button onClick={() => setTab("discover")} className="text-xs font-bold text-[#F2C94C]">See more</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {filteredProfiles.slice(0, 4).map((profile) => (
            <button key={profile.id} onClick={() => openDetails(profile)} className="group relative h-52 overflow-hidden rounded-[23px] border border-white/10 bg-[#181b22] text-left">
              <Image src={profile.image} alt={profile.name} fill sizes="190px" className="object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
              <div className="absolute left-3 top-3 rounded-full bg-black/50 px-2 py-1 text-[9px] font-black text-[#FFE58C] backdrop-blur-md">{profile.compatibility}% MATCH</div>
              <div className="absolute inset-x-0 bottom-0 p-3.5"><div className="flex items-center gap-1.5"><p className="text-lg font-black">{profile.name}, {profile.age}</p>{profile.verified && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#4DA3FF]"><Icon name="check" className="h-2.5 w-2.5" /></span>}</div><p className="mt-0.5 flex items-center gap-1 text-[11px] text-white/60"><Icon name="pin" className="h-3 w-3" /> {profile.location} · {profile.distance}</p></div>
            </button>
          ))}
        </div>
        {filteredProfiles.length === 0 && <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-sm text-white/45">No profiles matched that search.</div>}
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">Around you</p><h2 className="mt-0.5 text-xl font-black">Nearby</h2></div><span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">12 online</span></div>
        <div className="space-y-2.5">
          {profiles.slice(4, 8).map((profile) => (
            <button key={profile.id} onClick={() => openDetails(profile)} className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-2.5 text-left transition hover:bg-white/[0.06]">
              <div className="relative h-14 w-14 overflow-hidden rounded-2xl"><Image src={profile.image} alt={profile.name} fill sizes="56px" className="object-cover" />{profile.online && <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border-2 border-[#15171d] bg-emerald-400" />}</div>
              <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><p className="font-black">{profile.name}, {profile.age}</p>{profile.verified && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#4DA3FF]"><Icon name="check" className="h-2.5 w-2.5" /></span>}</div><p className="mt-0.5 truncate text-xs text-white/45">{profile.occupation} · {profile.location}</p></div>
              <div className="text-right"><p className="text-[11px] font-bold text-[#F2C94C]">{profile.distance}</p><Icon name="chevron" className="ml-auto mt-1 h-4 w-4 text-white/25" /></div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function DiscoverScreen({ current, next, third, drag, dragging, animating, onPointerDown, onPointerMove, onPointerUp, swipe, undoSwipe, openDetails, setOverlay }: { current: Profile; next: Profile; third: Profile; drag: { x: number; y: number }; dragging: boolean; animating: boolean; onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void; onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void; onPointerUp: () => void; swipe: (direction: "left" | "right" | "super") => void; undoSwipe: () => void; openDetails: (profile: Profile) => void; setOverlay: (overlay: Overlay) => void; }) {
  const rotation = drag.x / 18;
  const likeOpacity = Math.min(1, Math.max(0, drag.x / 90));
  const passOpacity = Math.min(1, Math.max(0, -drag.x / 90));
  const superOpacity = Math.min(1, Math.max(0, -drag.y / 85));

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-4">
      <header className="mb-3 flex items-center justify-between px-1">
        <div><div className="flex items-center gap-2"><p className="text-[10px] font-black tracking-[0.32em] text-[#F2C94C]">NAIJA MATCH</p><span className="rounded-full bg-red-400/10 px-2 py-0.5 text-[8px] font-black text-red-300">DEMO</span></div><h1 className="mt-1 text-2xl font-black">Discover</h1></div>
        <div className="flex gap-2"><button onClick={undoSwipe} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-white/60"><Icon name="undo" /></button><button onClick={() => setOverlay("premium")} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#F2C94C]/25 bg-[#F2C94C]/10 text-[#F2C94C]"><Icon name="filter" /></button></div>
      </header>

      <button onClick={() => setOverlay("premium")} className="gold-shine mb-3 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#F2C94C] to-[#FFE58C] px-4 py-2 text-[11px] font-black text-black"><Icon name="crown" className="h-4 w-4" /> Upgrade to see who likes you</button>

      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-x-6 bottom-2 top-6 rotate-[4deg] overflow-hidden rounded-[30px] border border-white/[0.06] bg-[#1b1e25] opacity-45"><Image src={third.image} alt="Next profile" fill sizes="390px" className="object-cover opacity-35" /></div>
        <div className="absolute inset-x-3 bottom-1 top-3 rotate-[2deg] overflow-hidden rounded-[30px] border border-white/10 bg-[#1b1e25] opacity-75"><Image src={next.image} alt={`${next.name} preview`} fill sizes="390px" className="object-cover opacity-60" /></div>

        <div onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onClick={() => { if (Math.abs(drag.x) < 8 && Math.abs(drag.y) < 8) openDetails(current); }} className="card-grab absolute inset-0 overflow-hidden rounded-[30px] border border-white/10 bg-[#1b1e25] shadow-2xl" style={{ transform: `translate3d(${drag.x}px, ${drag.y}px, 0) rotate(${rotation}deg)`, transition: dragging ? "none" : "transform 290ms cubic-bezier(.2,.8,.2,1)", opacity: animating ? 0.92 : 1 }}>
          <Image src={current.image} alt={`${current.name} profile`} fill priority sizes="390px" className="pointer-events-none object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/5" />

          <div style={{ opacity: likeOpacity }} className="absolute left-5 top-24 rotate-[-10deg] rounded-xl border-4 border-emerald-400 px-4 py-1.5 text-3xl font-black tracking-widest text-emerald-400">LIKE</div>
          <div style={{ opacity: passOpacity }} className="absolute right-5 top-24 rotate-[10deg] rounded-xl border-4 border-[#EB5757] px-4 py-1.5 text-3xl font-black tracking-widest text-[#EB5757]">NOPE</div>
          <div style={{ opacity: superOpacity }} className="absolute left-1/2 top-20 -translate-x-1/2 rounded-xl border-4 border-[#4DA3FF] px-4 py-1.5 text-2xl font-black tracking-wider text-[#4DA3FF]">SUPER</div>

          <div className="absolute left-4 top-4 flex items-center gap-2"><span className="flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-[10px] font-bold backdrop-blur-md"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#4DA3FF]"><Icon name="check" className="h-2.5 w-2.5" /></span> Verified</span>{current.online && <span className="rounded-full bg-emerald-400/15 px-2.5 py-1.5 text-[10px] font-bold text-emerald-300 backdrop-blur-md">● Online</span>}</div>
          <span className="absolute right-4 top-4 rounded-full bg-[#F2C94C] px-3 py-1.5 text-[10px] font-black text-black">{current.distance}</span>

          <div className="absolute inset-x-0 bottom-0 p-5 pt-28">
            <div className="mb-2 flex items-end gap-2"><h2 className="text-[34px] font-black leading-none tracking-tight">{current.name}, {current.age}</h2><span className="mb-1 rounded-full bg-[#F2C94C]/15 px-2 py-1 text-[10px] font-black text-[#FFE58C]">{current.compatibility}%</span></div>
            <p className="flex items-center gap-1.5 text-sm font-bold text-[#F2C94C]"><Icon name="pin" className="h-4 w-4" /> {current.location}, Nigeria · {current.tribe}</p>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/75">{current.bio}</p>
            <div className="mt-3 flex flex-wrap gap-2">{current.interests.map((interest) => <span key={interest} className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[10px] font-bold backdrop-blur-md">{interest}</span>)}</div>
            <p className="mt-3 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-white/35">Drag left or right · Swipe up for Super Like</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-4">
        <button onClick={() => swipe("left")} className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white text-[#EB5757] shadow-xl transition active:scale-90"><Icon name="x" className="h-7 w-7" /></button>
        <button onClick={() => swipe("super")} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4DA3FF] text-white shadow-[0_0_26px_rgba(77,163,255,0.28)] transition active:scale-90"><Icon name="star" className="h-5 w-5" /></button>
        <button onClick={() => swipe("right")} className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F2C94C] text-black shadow-[0_0_30px_rgba(242,201,76,0.3)] transition active:scale-90"><Icon name="heart" className="h-7 w-7 fill-current" /></button>
      </div>
    </div>
  );
}

function LikesScreen({ setOverlay, openDetails }: { setOverlay: (overlay: Overlay) => void; openDetails: (profile: Profile) => void; }) {
  return (
    <div className="app-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-5">
      <header><div className="flex items-center gap-2"><p className="text-[10px] font-black tracking-[0.32em] text-[#F2C94C]">NAIJA MATCH</p><span className="rounded-full bg-[#F2C94C]/10 px-2 py-0.5 text-[9px] font-black text-[#FFE58C]">12 NEW</span></div><h1 className="mt-1 text-3xl font-black">People like you.</h1><p className="mt-1 text-sm text-white/45">Your admirers are waiting to be discovered.</p></header>
      <button onClick={() => setOverlay("premium")} className="gold-shine mt-5 w-full rounded-[26px] bg-gradient-to-br from-[#F2C94C] to-[#B8860B] p-5 text-left text-black shadow-[0_18px_50px_rgba(242,201,76,0.18)]"><div className="flex items-start justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/10"><Icon name="crown" className="h-6 w-6" /></div><span className="rounded-full bg-black/10 px-3 py-1 text-[10px] font-black">MOST POPULAR</span></div><h2 className="mt-6 text-2xl font-black">See every person who liked you.</h2><p className="mt-1 max-w-[290px] text-xs font-medium text-black/65">Unlock your likes, unlimited swipes, boosts, Super Likes and premium filters.</p><div className="mt-4 inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-black text-white">Unlock Gold <Icon name="chevron" className="h-4 w-4" /></div></button>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {profiles.slice(1, 7).map((profile, index) => (
          <button key={profile.id} onClick={() => index === 0 ? openDetails(profile) : setOverlay("premium")} className="relative h-56 overflow-hidden rounded-[24px] border border-white/10 bg-[#181b22] text-left">
            <Image src={profile.image} alt={profile.name} fill sizes="190px" className={`object-cover ${index === 0 ? "" : "scale-110 blur-[10px]"}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-transparent" />
            {index > 0 && <div className="absolute inset-0 flex items-center justify-center"><span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/35 backdrop-blur-xl"><Icon name="crown" className="h-5 w-5 text-[#F2C94C]" /></span></div>}
            <div className="absolute inset-x-0 bottom-0 p-3.5"><p className="font-black">{index === 0 ? `${profile.name}, ${profile.age}` : "Secret admirer"}</p><p className="mt-0.5 text-[10px] font-bold text-[#F2C94C]">{index === 0 ? profile.location : `${profile.distance} · Upgrade to reveal`}</p></div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatScreen({ chatProfile, setChatProfile, message, setMessage, sentMessages, sendMessage, showToast }: { chatProfile: Profile | null; setChatProfile: (profile: Profile | null) => void; message: string; setMessage: (value: string) => void; sentMessages: string[]; sendMessage: () => void; showToast: (text: string) => void; }) {
  if (chatProfile) {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-4">
        <header className="flex items-center gap-3 border-b border-white/[0.07] pb-3">
          <button onClick={() => setChatProfile(null)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.055] text-white/70"><Icon name="back" /></button>
          <div className="relative h-11 w-11 overflow-hidden rounded-full"><Image src={chatProfile.image} alt={chatProfile.name} fill sizes="44px" className="object-cover" /><span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#111318] bg-emerald-400" /></div>
          <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><p className="font-black">{chatProfile.name}</p><span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#4DA3FF]"><Icon name="check" className="h-2.5 w-2.5" /></span></div><p className="text-[11px] text-emerald-300">Online now</p></div>
          <button className="text-white/45"><Icon name="more" /></button>
        </header>
        <div className="app-scroll min-h-0 flex-1 overflow-y-auto py-5">
          <p className="mb-5 text-center text-[10px] font-bold uppercase tracking-widest text-white/25">Today</p>
          <div className="space-y-3 text-sm">
            <div className="max-w-[78%] rounded-[20px] rounded-tl-md bg-white/[0.075] px-4 py-3 text-white/85">Hey 👋 nice to match with you.</div>
            <div className="ml-auto max-w-[78%] rounded-[20px] rounded-tr-md bg-[#F2C94C] px-4 py-3 text-black">Same here 😊 How is your day in {chatProfile.location}?</div>
            <div className="max-w-[78%] rounded-[20px] rounded-tl-md bg-white/[0.075] px-4 py-3 text-white/85">Going well. Your profile has such a good energy.</div>
            {sentMessages.map((text, index) => <div key={`${text}-${index}`} className="ml-auto max-w-[78%] rounded-[20px] rounded-tr-md bg-[#F2C94C] px-4 py-3 text-black">{text}<p className="mt-1 text-right text-[9px] text-black/45">Read ✓✓</p></div>)}
            <div className="flex w-fit items-center gap-1 rounded-[18px] rounded-tl-md bg-white/[0.075] px-4 py-3"><span className="typing-dot h-1.5 w-1.5 rounded-full bg-white/60"/><span className="typing-dot h-1.5 w-1.5 rounded-full bg-white/60"/><span className="typing-dot h-1.5 w-1.5 rounded-full bg-white/60"/></div>
          </div>
        </div>
        <div className="flex items-end gap-2 rounded-[22px] border border-white/10 bg-white/[0.055] p-2">
          <button onClick={() => showToast("Photo upload will connect to Supabase Storage")} className="flex h-10 w-10 items-center justify-center rounded-full text-white/45"><Icon name="image" /></button>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} rows={1} placeholder="Write a message..." className="max-h-24 min-h-10 flex-1 resize-none bg-transparent py-2.5 text-sm outline-none placeholder:text-white/30" />
          <button onClick={() => showToast("Emoji picker coming in the next phase")} className="flex h-10 w-10 items-center justify-center rounded-full text-white/45"><Icon name="smile" /></button>
          {message.trim() ? <button onClick={sendMessage} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F2C94C] text-black"><Icon name="send" className="h-4 w-4" /></button> : <button onClick={() => showToast("Hold to record a voice message")} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F2C94C] text-black"><Icon name="mic" className="h-4 w-4" /></button>}
        </div>
      </div>
    );
  }

  return (
    <div className="app-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-5">
      <header><p className="text-[10px] font-black tracking-[0.32em] text-[#F2C94C]">NAIJA MATCH</p><h1 className="mt-1 text-3xl font-black">Messages</h1><p className="mt-1 text-sm text-white/45">Keep the spark going.</p></header>
      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3"><Icon name="search" className="h-5 w-5 text-white/30" /><input placeholder="Search conversations" className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/30" /></div>
      <div className="mt-5"><p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">New matches</p><div className="app-scroll flex gap-3 overflow-x-auto pb-1">{profiles.slice(0, 5).map((profile) => <button key={profile.id} onClick={() => setChatProfile(profile)} className="min-w-[62px] text-center"><div className="relative h-[60px] w-[60px] overflow-hidden rounded-full border-2 border-[#F2C94C]"><Image src={profile.image} alt={profile.name} fill sizes="60px" className="object-cover" /></div><p className="mt-1.5 text-[10px] font-bold">{profile.name}</p></button>)}</div></div>
      <div className="mt-6 space-y-1"><div className="mb-2 flex items-center justify-between"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">Conversations</p><span className="text-[10px] font-bold text-[#F2C94C]">3 unread</span></div>{profiles.slice(0, 6).map((profile, index) => <button key={profile.id} onClick={() => setChatProfile(profile)} className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-white/[0.045]"><div className="relative h-14 w-14 overflow-hidden rounded-full"><Image src={profile.image} alt={profile.name} fill sizes="56px" className="object-cover" />{profile.online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0d0f14] bg-emerald-400" />}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between"><p className="font-black">{profile.name}</p><span className="text-[10px] text-white/30">{index < 2 ? "Now" : `${index + 1}h`}</span></div><p className={`mt-1 truncate text-xs ${index < 3 ? "font-semibold text-white/70" : "text-white/35"}`}>{index === 0 ? "I like your vibe too 😊" : index === 1 ? "What are you doing this weekend?" : index === 2 ? "Voice message · 0:18" : "You matched recently — say hello!"}</p></div>{index < 3 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F2C94C] px-1 text-[9px] font-black text-black">{index + 1}</span>}</button>)}</div>
    </div>
  );
}

function ProfileScreen({ setOverlay, showToast }: { setOverlay: (overlay: Overlay) => void; showToast: (text: string) => void; }) {
  const menu = [
    { title: "Edit profile", subtitle: "Photos, bio and personal details", icon: "user" as IconName, action: () => showToast("Profile editor is ready for the Supabase phase") },
    { title: "Get verified", subtitle: "Build trust with a verified badge", icon: "shield" as IconName, action: () => showToast("Verification flow will be added with the backend") },
    { title: "NAIJA MATCH Gold", subtitle: "Unlock every premium feature", icon: "crown" as IconName, action: () => setOverlay("premium") },
    { title: "Settings & privacy", subtitle: "Notifications, privacy and account", icon: "settings" as IconName, action: () => setOverlay("settings") },
  ];
  return (
    <div className="app-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-5">
      <header className="flex items-center justify-between"><div><p className="text-[10px] font-black tracking-[0.32em] text-[#F2C94C]">YOUR ACCOUNT</p><h1 className="mt-1 text-3xl font-black">Profile</h1></div><button onClick={() => setOverlay("settings")} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-white/65"><Icon name="settings" /></button></header>
      <section className="mt-5 overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-[#1d1a11] via-[#15161b] to-[#111318] p-5 shadow-2xl"><div className="flex items-center gap-4"><div className="relative"><div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#F2C94C] via-[#E3AC25] to-[#8B6508] text-2xl font-black text-black">CM</div><span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-[#17171a] bg-[#4DA3FF]"><Icon name="check" className="h-3.5 w-3.5" /></span></div><div className="min-w-0 flex-1"><h2 className="text-2xl font-black">Chidi, 29</h2><p className="mt-1 text-xs font-semibold text-[#F2C94C]">Product Designer · Lagos</p><p className="mt-2 text-xs text-white/45">Profile visible · Active now</p></div></div><div className="mt-5"><div className="flex items-center justify-between text-xs"><span className="font-bold">Profile strength</span><span className="font-black text-[#F2C94C]">82%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[82%] rounded-full bg-gradient-to-r from-[#F2C94C] to-[#FFE58C]" /></div><p className="mt-2 text-[10px] text-white/35">Add two more photos to increase your visibility.</p></div></section>
      <div className="mt-4 grid grid-cols-3 gap-2"><div className="glass-panel rounded-2xl p-3 text-center"><p className="text-xl font-black">48</p><p className="mt-1 text-[10px] text-white/40">Likes</p></div><div className="glass-panel rounded-2xl p-3 text-center"><p className="text-xl font-black">12</p><p className="mt-1 text-[10px] text-white/40">Matches</p></div><div className="glass-panel rounded-2xl p-3 text-center"><p className="text-xl font-black">326</p><p className="mt-1 text-[10px] text-white/40">Views</p></div></div>
      <button onClick={() => setOverlay("premium")} className="gold-shine mt-4 flex w-full items-center gap-3 rounded-2xl bg-[#F2C94C] p-4 text-left text-black"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/10"><Icon name="sparkles" /></span><span className="flex-1"><span className="block text-sm font-black">Boost your profile</span><span className="block text-[10px] font-semibold text-black/55">Be a top profile in your area for 30 minutes.</span></span><Icon name="chevron" className="h-5 w-5" /></button>
      <div className="mt-5 space-y-2">{menu.map((item) => <button key={item.title} onClick={item.action} className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3.5 text-left"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.055] text-[#F2C94C]"><Icon name={item.icon} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-black">{item.title}</span><span className="mt-0.5 block truncate text-[10px] text-white/35">{item.subtitle}</span></span><Icon name="chevron" className="h-4 w-4 text-white/25" /></button>)}</div>
    </div>
  );
}

function BottomNav({ tab, setTab }: { tab: MainTab; setTab: (tab: MainTab) => void; }) {
  return (
    <nav className="relative z-30 grid grid-cols-5 border-t border-white/[0.07] bg-[#0f1116]/95 px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl">
      {navItems.map((item) => { const active = tab === item.id; return <button key={item.id} onClick={() => setTab(item.id)} className={`relative flex flex-col items-center gap-1 rounded-2xl py-1.5 text-[9px] font-bold transition ${active ? "text-[#F2C94C]" : "text-white/35"}`}>{active && <span className="absolute -top-2 h-0.5 w-8 rounded-full bg-[#F2C94C] shadow-[0_0_12px_rgba(242,201,76,0.7)]" />}<Icon name={item.icon} className={`h-[21px] w-[21px] ${active && item.id === "likes" ? "fill-current" : ""}`} />{item.label}</button>; })}
    </nav>
  );
}

function OverlayShell({ children }: { children: React.ReactNode }) {
  return <div className="absolute inset-0 z-50 flex flex-col bg-[#0d0f14]/98 backdrop-blur-2xl">{children}</div>;
}

function MatchOverlay({ profile, close, openChat }: { profile: Profile; close: () => void; openChat: () => void; }) {
  return (
    <OverlayShell>
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 text-center">
        {[12, 26, 42, 58, 74, 88].map((left, index) => <span key={left} className="floating-heart text-2xl text-[#F2C94C]" style={{ left: `${left}%`, animationDelay: `${index * 0.32}s` }}>♥</span>)}
        <button onClick={close} className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-white/55"><Icon name="x" /></button>
        <div className="match-pop"><p className="text-[10px] font-black tracking-[0.34em] text-[#F2C94C]">NAIJA MATCH</p><h2 className="mt-3 bg-gradient-to-r from-[#FFE58C] via-[#F2C94C] to-[#ff9f43] bg-clip-text text-6xl font-black italic leading-none text-transparent">IT&apos;S A MATCH!</h2><p className="mx-auto mt-4 max-w-[290px] text-sm leading-relaxed text-white/55">You and {profile.name} liked each other. Start with something genuine.</p></div>
        <div className="match-pop relative mt-10 flex items-center justify-center -space-x-5"><div className="pulse-ring absolute h-32 w-32 rounded-full border border-[#F2C94C]/35" /><div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-[#0d0f14] bg-gradient-to-br from-[#F2C94C] to-[#8B6508] text-xl font-black text-black shadow-2xl">YOU</div><div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-[#F2C94C] shadow-[0_0_45px_rgba(242,201,76,0.38)]"><Image src={profile.image} alt={profile.name} fill sizes="128px" className="object-cover" /></div></div>
        <div className="mt-11 w-full space-y-3"><button onClick={openChat} className="w-full rounded-2xl bg-[#F2C94C] py-4 text-sm font-black text-black shadow-[0_15px_35px_rgba(242,201,76,0.2)]">Send {profile.name} a message</button><button onClick={close} className="w-full rounded-2xl border border-white/10 bg-white/[0.045] py-4 text-sm font-bold text-white/65">Keep discovering</button></div>
      </div>
    </OverlayShell>
  );
}

function DetailsOverlay({ profile, close, like, openChat }: { profile: Profile; close: () => void; like: () => void; openChat: () => void; }) {
  const details = [["Occupation", profile.occupation], ["Education", profile.education], ["Religion", profile.religion], ["Height", profile.height], ["Languages", profile.languages.join(", ")], ["Lifestyle", profile.lifestyle]];
  return (
    <OverlayShell>
      <div className="app-scroll min-h-0 flex-1 overflow-y-auto pb-7">
        <div className="relative h-[47vh] min-h-[360px] overflow-hidden"><Image src={profile.image} alt={profile.name} fill sizes="430px" className="object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#0d0f14] via-transparent to-black/25" /><button onClick={close} className="absolute left-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-xl"><Icon name="back" /></button><button className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-xl"><Icon name="more" /></button><div className="absolute inset-x-0 bottom-0 px-5 pb-5"><div className="flex items-center gap-2"><h1 className="text-4xl font-black">{profile.name}, {profile.age}</h1>{profile.verified && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4DA3FF]"><Icon name="check" className="h-3.5 w-3.5" /></span>}</div><p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-[#F2C94C]"><Icon name="pin" className="h-4 w-4" /> {profile.location}, Nigeria · {profile.distance}</p></div></div>
        <div className="px-5"><div className="flex gap-2">{profile.online && <span className="rounded-full bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold text-emerald-300">● Online now</span>}<span className="rounded-full bg-[#F2C94C]/10 px-3 py-1.5 text-[10px] font-bold text-[#FFE58C]">{profile.compatibility}% compatible</span><span className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold text-white/55">{profile.joined}</span></div>
          <section className="mt-6"><h2 className="text-lg font-black">About me</h2><p className="mt-2 text-sm leading-6 text-white/58">{profile.bio}</p></section>
          <section className="mt-6"><h2 className="text-lg font-black">Looking for</h2><div className="mt-2 rounded-2xl border border-[#F2C94C]/15 bg-[#F2C94C]/[0.06] p-4 text-sm font-semibold text-[#FFE58C]">{profile.lookingFor}</div></section>
          <section className="mt-6"><h2 className="text-lg font-black">Interests</h2><div className="mt-3 flex flex-wrap gap-2">{profile.interests.map((interest) => <span key={interest} className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-bold text-white/65">{interest}</span>)}</div></section>
          <section className="mt-6"><h2 className="text-lg font-black">The details</h2><div className="mt-3 grid grid-cols-2 gap-2">{details.map(([label, value]) => <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-white/30">{label}</p><p className="mt-1.5 text-xs font-bold text-white/75">{value}</p></div>)}</div></section>
          <div className="mt-7 grid grid-cols-[1fr_auto] gap-3"><button onClick={like} className="flex items-center justify-center gap-2 rounded-2xl bg-[#F2C94C] py-4 text-sm font-black text-black"><Icon name="heart" className="h-5 w-5 fill-current" /> Like {profile.name}</button><button onClick={openChat} className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-[#F2C94C]"><Icon name="chat" /></button></div>
        </div>
      </div>
    </OverlayShell>
  );
}

function NotificationsOverlay({ close }: { close: () => void }) {
  return <OverlayShell><header className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-5"><button onClick={close} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.055]"><Icon name="back" /></button><div><p className="text-[10px] font-black tracking-[0.25em] text-[#F2C94C]">ACTIVITY</p><h1 className="text-2xl font-black">Notifications</h1></div></header><div className="app-scroll flex-1 overflow-y-auto p-5"><div className="space-y-3">{notifications.map((item, index) => <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${index === 1 ? "bg-[#F2C94C]/10 text-[#F2C94C]" : "bg-[#4DA3FF]/10 text-[#4DA3FF]"}`}><Icon name={index === 1 ? "heart" : index === 2 ? "sparkles" : "user"} /></span><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><p className="text-sm font-black">{item.title}</p><span className="text-[10px] text-white/25">{item.time}</span></div><p className="mt-1 text-xs leading-5 text-white/40">{item.text}</p></div></div>)}</div></div></OverlayShell>;
}

function PremiumOverlay({ close, showToast }: { close: () => void; showToast: (text: string) => void }) {
  const features = ["See everyone who likes you", "Unlimited Likes", "5 Super Likes every week", "Monthly profile boost", "Advanced matching filters", "Priority profile visibility"];
  return <OverlayShell><div className="app-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-7 pt-5"><div className="flex justify-end"><button onClick={close} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-white/55"><Icon name="x" /></button></div><div className="mt-1 text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#F2C94C] text-black shadow-[0_0_40px_rgba(242,201,76,0.28)]"><Icon name="crown" className="h-8 w-8" /></span><p className="mt-5 text-[10px] font-black tracking-[0.34em] text-[#F2C94C]">NAIJA MATCH GOLD</p><h1 className="mt-2 text-4xl font-black leading-tight">Date without limits.</h1><p className="mx-auto mt-3 max-w-[310px] text-sm leading-6 text-white/45">Stand out, see who likes you, and create more meaningful connections.</p></div><div className="mt-7 space-y-2.5">{features.map((feature) => <div key={feature} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3.5"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2C94C]/10 text-[#F2C94C]"><Icon name="check" className="h-4 w-4" /></span><p className="text-sm font-bold text-white/75">{feature}</p></div>)}</div><div className="mt-7 space-y-3"><button onClick={() => showToast("Annual plan selected — payment integration comes later")} className="relative w-full rounded-[22px] border-2 border-[#F2C94C] bg-[#F2C94C]/[0.07] p-4 text-left"><span className="absolute -top-3 right-4 rounded-full bg-[#F2C94C] px-3 py-1 text-[9px] font-black text-black">SAVE 45%</span><div className="flex items-end justify-between"><div><p className="text-sm font-black">12 months</p><p className="mt-1 text-[10px] text-white/35">Best value · billed annually</p></div><div className="text-right"><p className="text-2xl font-black text-[#FFE58C]">₦4,250</p><p className="text-[9px] text-white/30">per month</p></div></div></button><button onClick={() => showToast("Monthly plan selected — payment integration comes later")} className="w-full rounded-[22px] border border-white/10 bg-white/[0.035] p-4 text-left"><div className="flex items-end justify-between"><div><p className="text-sm font-black">1 month</p><p className="mt-1 text-[10px] text-white/35">Flexible monthly access</p></div><div className="text-right"><p className="text-2xl font-black">₦7,500</p><p className="text-[9px] text-white/30">per month</p></div></div></button></div><button onClick={() => showToast("Paystack and Flutterwave will be connected in the payments phase")} className="gold-shine mt-5 w-full rounded-2xl bg-[#F2C94C] py-4 text-sm font-black text-black">Continue with Gold</button><p className="mt-3 text-center text-[9px] leading-4 text-white/25">Prototype pricing for presentation only. No payment will be taken.</p></div></OverlayShell>;
}

function SettingsOverlay({ close, settings, setSettings, showToast }: { close: () => void; settings: { notifications: boolean; darkMode: boolean; distance: boolean }; setSettings: (settings: { notifications: boolean; darkMode: boolean; distance: boolean }) => void; showToast: (text: string) => void; }) {
  const toggles: { key: keyof typeof settings; title: string; text: string }[] = [{ key: "notifications", title: "Notifications", text: "Matches, messages and profile activity" }, { key: "darkMode", title: "Dark mode", text: "Use the premium dark appearance" }, { key: "distance", title: "Show my distance", text: "Allow matches to see approximate distance" }];
  return <OverlayShell><header className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-5"><button onClick={close} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.055]"><Icon name="back" /></button><div><p className="text-[10px] font-black tracking-[0.25em] text-[#F2C94C]">ACCOUNT</p><h1 className="text-2xl font-black">Settings</h1></div></header><div className="app-scroll flex-1 overflow-y-auto p-5"><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">Preferences</p><div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.035]">{toggles.map((item, index) => <div key={item.key} className={`flex items-center gap-3 p-4 ${index ? "border-t border-white/[0.06]" : ""}`}><div className="min-w-0 flex-1"><p className="text-sm font-black">{item.title}</p><p className="mt-1 text-[10px] text-white/35">{item.text}</p></div><button onClick={() => setSettings({ ...settings, [item.key]: !settings[item.key] })} className={`relative h-7 w-12 rounded-full transition ${settings[item.key] ? "bg-[#F2C94C]" : "bg-white/15"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${settings[item.key] ? "left-6" : "left-1"}`} /></button></div>)}</div><p className="mb-3 mt-7 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">Safety & privacy</p><div className="space-y-2">{["Privacy controls", "Blocked users", "Safety centre", "Help and support"].map((title) => <button key={title} onClick={() => showToast(`${title} will be connected in the production phase`)} className="flex w-full items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4 text-sm font-bold"><span>{title}</span><Icon name="chevron" className="h-4 w-4 text-white/25" /></button>)}</div><button onClick={() => showToast("Account deletion requires secure authentication")} className="mt-7 w-full rounded-2xl border border-red-400/15 bg-red-400/[0.06] py-4 text-sm font-black text-red-300">Delete account</button></div></OverlayShell>;
}
