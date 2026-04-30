"use client";

import { useState } from "react";

const profiles = [
  {
    name: "Amaka",
    age: 25,
    location: "Lagos",
    tribe: "Igbo",
    distance: "3 km away",
    verified: true,
    interest: ["Business", "Travel", "Music"],
    bio: "Confident, ambitious, and loves meaningful conversations.",
    image: "/profiles/amaka.jpg",
  },
  {
    name: "Aisha",
    age: 26,
    location: "Abuja",
    tribe: "Hausa",
    distance: "7 km away",
    verified: true,
    interest: ["Family", "Lifestyle", "Food"],
    bio: "Calm, focused, and interested in serious connections.",
    image: "/profiles/aisha.jpg",
  },
  {
    name: "Temi",
    age: 24,
    location: "Ibadan",
    tribe: "Yoruba",
    distance: "5 km away",
    verified: true,
    interest: ["Fashion", "Faith", "Movies"],
    bio: "Fun, respectful, and looking for good energy.",
    image: "/profiles/temi.jpg",
  },
  {
    name: "Kemi",
    age: 28,
    location: "Lekki",
    tribe: "Yoruba",
    distance: "2 km away",
    verified: true,
    interest: ["Luxury", "Travel", "Fitness"],
    bio: "Elegant lifestyle, ambitious mindset.",
    image: "/profiles/kemi.jpg",
  },
  {
    name: "Ada",
    age: 27,
    location: "Port Harcourt",
    tribe: "Igbo",
    distance: "9 km away",
    verified: true,
    interest: ["Business", "Networking"],
    bio: "Driven and focused, looking for real connection.",
    image: "/profiles/ada.jpg",
  },
  {
    name: "Ifeoma",
    age: 29,
    location: "Enugu",
    tribe: "Igbo",
    distance: "6 km away",
    verified: true,
    interest: ["Classy", "Calm", "Intelligent"],
    bio: "Mature, respectful, and intentional.",
    image: "/profiles/ifeoma.jpg",
  },
  {
    name: "Zainab",
    age: 24,
    location: "Kano",
    tribe: "Hausa",
    distance: "4 km away",
    verified: true,
    interest: ["Family", "Modest", "Culture"],
    bio: "Kind-hearted and values respect.",
    image: "/profiles/zainab.jpg",
  },
  {
    name: "Chidinma",
    age: 26,
    location: "Owerri",
    tribe: "Igbo",
    distance: "8 km away",
    verified: true,
    interest: ["Fun", "Lifestyle", "Travel"],
    bio: "Positive vibe, loves to enjoy life.",
    image: "/profiles/chidinma.jpg",
  },
];

export default function Home() {
  const [index, setIndex] = useState(0);
  const [screen, setScreen] = useState<
    "discover" | "match" | "chat" | "likes" | "profile"
  >("discover");

  const [direction, setDirection] = useState<"left" | "right" | "">("");

  const current = profiles[index];
  const next = profiles[(index + 1) % profiles.length];

  const nextProfile = () => {
    if (index === profiles.length - 1) {
      alert("No more profiles nearby — come back later!");
    }

    setTimeout(() => {
      setIndex((prev) => (prev + 1) % profiles.length);
      setDirection("");
    }, 260);
  };

  const passProfile = () => {
    setDirection("left");
    nextProfile();
  };

  const likeProfile = () => {
    setDirection("right");

    setTimeout(() => {
      setDirection("");
      setScreen("match");
    }, 300);
  };

  const superLikeProfile = () => {
    alert(`Super Like sent to ${current.name}!`);
  };

  const resetToDiscover = () => {
    setScreen("discover");
    setIndex((prev) => (prev + 1) % profiles.length);
  };

  return (
    <main className="min-h-screen bg-[#090A0D] flex items-center justify-center p-4 text-white">
      <section className="relative w-[390px] h-[760px] overflow-hidden rounded-[34px] border border-white/10 bg-[#111318] shadow-[0_0_80px_rgba(242,201,76,0.25)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(242,201,76,0.22),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.06),transparent_35%)]" />

        <div className="relative z-10 flex h-full flex-col p-4">
          {/* TOP BAR */}
          <header className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[0.35em] text-[#F2C94C]">
                NAIJA MATCH
              </p>

              <h1 className="text-xl font-extrabold">
                {screen === "discover" && "Discover"}
                {screen === "match" && "Match"}
                {screen === "chat" && "Messages"}
                {screen === "likes" && "Likes"}
                {screen === "profile" && "Profile"}
              </h1>
            </div>

            <button
              onClick={() =>
                alert("Filters: age, location, interests, verified users")
              }
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#F2C94C]"
            >
              ⚙️
            </button>
          </header>

          {/* DISCOVER */}
          {screen === "discover" && (
            <>
              <div className="mb-2 flex justify-center">
                <div className="rounded-full bg-[#F2C94C] px-4 py-1 text-xs font-bold text-black shadow-[0_0_18px_rgba(242,201,76,0.25)]">
                  ⭐ Upgrade to Premium — See who likes you
                </div>
              </div>

              <div className="mb-3 text-center text-xs text-gray-300">
                🚀 Boost your profile to get more matches
              </div>

              <div className="relative flex-1">
                {/* THIRD STACK CARD */}
                <div className="absolute inset-x-6 top-8 h-[92%] rotate-6 rounded-[28px] border border-white/10 bg-[#1B1E25] opacity-40" />

                {/* SECOND STACK CARD */}
                <div className="absolute inset-x-4 top-5 h-[92%] rotate-3 rounded-[28px] border border-white/10 bg-[#1B1E25] opacity-60">
                  <img
                    src={next.image}
                    className="h-full w-full rounded-[28px] object-cover opacity-60"
                    alt={`${next.name} preview`}
                  />
                </div>

                {/* MAIN CARD */}
                <div
                  className={`absolute inset-0 overflow-hidden rounded-[30px] border border-white/10 bg-[#1B1E25] shadow-2xl transition-all duration-300 ease-out ${
                    direction === "left"
                      ? "-translate-x-24 -rotate-12 opacity-0"
                      : direction === "right"
                        ? "translate-x-24 rotate-12 opacity-0"
                        : "translate-x-0 rotate-0 opacity-100"
                  }`}
                >
                  <img
                    src={current.image}
                    className="h-full w-full object-cover"
                    alt={`${current.name} profile`}
                  />

                  <div className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                    ✅ Verified
                  </div>

                  <div className="absolute right-4 top-4 rounded-full bg-[#F2C94C] px-3 py-1 text-xs font-bold text-black">
                    {current.distance}
                  </div>

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent p-5 pt-24">
                    <div className="mb-2 flex items-end gap-2">
                      <h2 className="text-3xl font-black leading-none">
                        {current.name}, {current.age}
                      </h2>

                      <span className="mb-1 text-[#4DA3FF]">●</span>

                      <span className="mb-1 text-xs text-green-400">
                        ● Online
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-[#F2C94C]">
                      📍 {current.location}, Nigeria • {current.tribe}
                    </p>

                    <p className="mt-2 text-sm text-gray-200">
                      {current.bio}
                    </p>

                    <p className="mt-2 text-xs text-gray-400">
                      Joined recently
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {current.interest.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="mt-5 flex items-center justify-center gap-5">
                <button
                  onClick={passProfile}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl font-bold text-[#EB5757] shadow-lg transition hover:scale-110"
                >
                  ×
                </button>

                <button
                  onClick={superLikeProfile}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-[#4DA3FF] text-xl text-white shadow-lg transition hover:scale-110"
                >
                  ★
                </button>

                <button
                  onClick={likeProfile}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F2C94C] text-2xl font-bold text-black shadow-[0_0_30px_rgba(242,201,76,0.35)] transition hover:scale-110"
                >
                  ❤
                </button>
              </div>

              {/* BOTTOM NAV */}
              <nav className="mt-4 grid grid-cols-4 rounded-3xl border border-white/10 bg-black/25 p-2 text-center text-xs text-gray-400">
                <button className="text-[#F2C94C]">
                  🔥
                  <br />
                  Discover
                </button>

                <button onClick={() => setScreen("likes")}>
                  💛
                  <br />
                  Likes
                </button>

                <button onClick={() => setScreen("chat")}>
                  💬
                  <br />
                  Chat
                </button>

                <button onClick={() => setScreen("profile")}>
                  👤
                  <br />
                  Profile
                </button>
              </nav>
            </>
          )}

          {/* MATCH */}
          {screen === "match" && (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="mb-8 flex items-center justify-center -space-x-5">
                <div className="h-28 w-28 rounded-full border-4 border-white bg-[#222]" />

                <img
                  src={current.image}
                  className="h-32 w-32 rounded-full border-4 border-[#F2C94C] object-cover shadow-[0_0_40px_rgba(242,201,76,0.45)]"
                  alt={`${current.name} match`}
                />
              </div>

              <h2 className="animate-pulse text-5xl font-black text-[#F2C94C]">
                MATCH!
              </h2>

              <p className="mt-3 text-gray-300">
                You and {current.name} liked each other.
              </p>

              <button
                onClick={() => setScreen("chat")}
                className="mt-8 w-full rounded-2xl bg-[#F2C94C] py-4 font-black text-black"
              >
                Start Chat
              </button>

              <button
                onClick={resetToDiscover}
                className="mt-4 text-sm text-gray-400"
              >
                Keep Discovering
              </button>
            </div>
          )}

          {/* CHAT */}
          {screen === "chat" && (
            <div className="flex flex-1 flex-col">
              <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={current.image}
                    className="h-11 w-11 rounded-full object-cover"
                    alt={`${current.name} chat`}
                  />

                  <div>
                    <p className="font-bold">{current.name}</p>

                    <p className="text-xs text-[#27AE60]">
                      Online • {current.location}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setScreen("discover")}
                  className="text-gray-400"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 space-y-3 text-sm">
                <div className="w-fit max-w-[75%] rounded-2xl rounded-tl-sm bg-white/10 p-3">
                  Hey 👋 nice to match with you.
                </div>

                <div className="ml-auto w-fit max-w-[75%] rounded-2xl rounded-tr-sm bg-[#F2C94C] p-3 text-black">
                  Same here 😊 how is your day in {current.location}?
                </div>

                <div className="w-fit max-w-[75%] rounded-2xl rounded-tl-sm bg-white/10 p-3">
                  Going well. I like your profile.
                </div>

                <div className="ml-auto w-fit max-w-[75%] rounded-2xl rounded-tr-sm bg-[#F2C94C] p-3 text-black">
                  Thank you. I like the vibe too.
                </div>
              </div>

              <div className="mt-4 flex">
                <input
                  placeholder="Type message..."
                  className="flex-1 rounded-l-2xl border border-white/10 bg-[#1C1F26] p-3 outline-none"
                />

                <button className="rounded-r-2xl bg-[#F2C94C] px-5 font-bold text-black">
                  Send
                </button>
              </div>
            </div>
          )}

          {/* LIKES */}
          {screen === "likes" && (
            <div className="flex flex-1 flex-col">
              <div className="mb-4 rounded-3xl border border-[#F2C94C]/30 bg-[#F2C94C]/10 p-4">
                <p className="text-sm font-bold text-[#F2C94C]">
                  Premium Feature
                </p>

                <p className="mt-1 text-xs text-gray-300">
                  Users can pay to unlock everyone who liked them.
                </p>
              </div>

              <h2 className="mb-4 text-2xl font-black">
                People who liked you
              </h2>

              <div className="grid grid-cols-2 gap-3">
                {profiles.slice(1, 5).map((p) => (
                  <div
                    key={p.name}
                    className="overflow-hidden rounded-2xl bg-white/10"
                  >
                    <img
                      src={p.image}
                      className="h-36 w-full object-cover"
                      alt={`${p.name} liked you`}
                    />

                    <div className="p-3">
                      <p className="font-bold">
                        {p.name}, {p.age}
                      </p>

                      <p className="text-xs text-[#F2C94C]">{p.location}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setScreen("discover")}
                className="mt-auto rounded-2xl bg-[#F2C94C] py-3 font-bold text-black"
              >
                Back to Discover
              </button>
            </div>
          )}

          {/* PROFILE DETAILS */}
          {screen === "profile" && (
            <div className="flex flex-1 flex-col">
              <img
                src={current.image}
                className="h-72 w-full rounded-3xl object-cover"
                alt={`${current.name} details`}
              />

              <h2 className="mt-5 text-3xl font-black">
                {current.name}, {current.age}
              </h2>

              <p className="mt-1 text-[#F2C94C]">
                {current.location}, Nigeria • {current.tribe}
              </p>

              <p className="mt-4 text-gray-300">{current.bio}</p>

              <p className="mt-2 text-xs text-green-400">
                ● Online now
              </p>

              <p className="mt-2 text-xs text-gray-400">
                Joined recently • Verified Nigerian profile
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {current.interest.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-white/10 px-3 py-1 text-xs"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <button
                onClick={() => setScreen("discover")}
                className="mt-auto rounded-2xl bg-[#F2C94C] py-3 font-bold text-black"
              >
                Back to Discover
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}