import Link from "next/link";
import { BrandArtwork, BrandLogo } from "@/components/brand/brand-logo";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen overflow-hidden px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[#0d0f14]/90 shadow-[0_30px_140px_rgba(0,0,0,0.65)]">
        <header className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-8">
          <BrandLogo href="/" size="lg" showTagline priority />
          <div className="flex items-center gap-2">
            {user ? (
              <Link
                href="/app"
                className="rounded-full bg-[#F2C94C] px-5 py-2.5 text-xs font-black text-black"
              >
                Open app
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full px-4 py-2.5 text-xs font-black text-white/65 hover:bg-white/[0.05]"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-[#F2C94C] px-5 py-2.5 text-xs font-black text-black"
                >
                  Join now
                </Link>
              </>
            )}
          </div>
        </header>

        <section className="relative grid flex-1 items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-14 lg:py-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,76,76,0.18),transparent_28%),radial-gradient(circle_at_85%_75%,rgba(242,201,76,0.12),transparent_30%)]" />
          <div className="relative z-10">
            <span className="inline-flex rounded-full border border-[#ff5252]/25 bg-[#ff5252]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#ffb2b2]">
              Premium pan-African dating
            </span>
            <h1 className="mt-6 max-w-2xl text-5xl font-black leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Find your person. Across Africa and beyond.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/48 sm:text-lg">
              AfroLove brings Africans at home and across the diaspora together
              for genuine chemistry, shared culture and lasting commitment.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={user ? "/app" : "/register"}
                className="gold-shine rounded-2xl bg-[#F2C94C] px-7 py-4 text-sm font-black text-black"
              >
                {user ? "Continue matching" : "Create free account"}
              </Link>
              {!user && (
                <Link
                  href="/login"
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-7 py-4 text-sm font-black text-white/70"
                >
                  I already have an account
                </Link>
              )}
            </div>
            <div className="mt-9 grid max-w-xl grid-cols-3 gap-3">
              {[
                ["54+", "African countries"],
                ["Private", "By design"],
                ["Real", "Connections"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4"
                >
                  <p className="text-xl font-black text-[#F2C94C]">{value}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/32">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 mx-auto w-full max-w-md">
            <div className="rotate-2 rounded-[36px] border border-white/10 bg-gradient-to-b from-[#1b1717] to-[#0b0d12] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.7)]">
              <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#111318]">
                <div className="border-b border-white/[0.07] p-4">
                  <BrandArtwork priority className="aspect-[16/7]" />
                  <p className="mt-4 text-xl font-black">
                    One Africa. Real connections.
                  </p>
                </div>
                <div className="space-y-3 p-5">
                  {[
                    "Country-aware discovery",
                    "Secure email authentication",
                    "Protected members-only app",
                    "Premium matching experience",
                  ].map((item, index) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F2C94C] text-xs font-black text-black">
                        0{index + 1}
                      </span>
                      <span className="text-sm font-bold text-white/68">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
        <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 border-t border-white/[0.07] px-5 py-5 text-[11px] font-bold text-white/35 sm:px-8">
          <Link href="/install" className="hover:text-[#F2C94C]">Install AfroLove</Link>
          <Link href="/safety" className="hover:text-[#F2C94C]">Safety Centre</Link>
          <Link href="/community-guidelines" className="hover:text-[#F2C94C]">Community Guidelines</Link>
          <Link href="/privacy" className="hover:text-[#F2C94C]">Privacy</Link>
          <Link href="/terms" className="hover:text-[#F2C94C]">Terms</Link>
        </footer>
      </div>
    </main>
  );
}
