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
    <main className="min-h-screen overflow-hidden px-2 py-3 sm:px-6 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-6xl flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[#0d0f14]/90 shadow-[0_30px_140px_rgba(0,0,0,0.65)] sm:min-h-[calc(100vh-5rem)] sm:rounded-[34px]">
        <header className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-3 py-3 sm:px-8 sm:py-4">
          <div className="min-w-0 sm:hidden">
            <BrandLogo href="/" size="sm" showTagline priority />
          </div>
          <div className="hidden min-w-0 sm:block">
            <BrandLogo href="/" size="lg" showTagline priority />
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {user ? (
              <Link
                href="/app"
                className="whitespace-nowrap rounded-full bg-[#F2C94C] px-3 py-2 text-[10px] font-black text-black sm:px-5 sm:py-2.5 sm:text-xs"
              >
                Open app
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="whitespace-nowrap rounded-full px-2.5 py-2 text-[10px] font-black text-white/65 hover:bg-white/[0.05] sm:px-4 sm:py-2.5 sm:text-xs"
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

        <section className="relative grid flex-1 items-center gap-7 overflow-hidden px-3 py-5 sm:gap-10 sm:px-8 sm:py-12 lg:grid-cols-[1.05fr_0.95fr] lg:px-14 lg:py-16">
          {/* AFROLOVE HERO SLIDESHOW TEST START */}
          <div
            aria-hidden="true"
            className="afrolove-hero-slideshow absolute inset-0"
          >
            {[
              [
                "/profiles/amaka.jpg",
                "/profiles/aisha.jpg",
                "/profiles/temi.jpg",
              ],
              [
                "/profiles/ifeoma.jpg",
                "/profiles/ada.jpg",
                "/profiles/chidinma.jpg",
              ],
              [
                "/profiles/zainab.jpg",
                "/profiles/kemi.jpg",
                "/profiles/amaka.jpg",
              ],
            ].map((images, slideIndex) => (
              <div
                key={images.join("-")}
                className="afrolove-hero-slide absolute inset-0"
                style={{
                  animationDelay: `${slideIndex * 7}s`,
                }}
              >
                <div className="grid h-full grid-cols-1 sm:grid-cols-3 sm:gap-2">
                  {images.map((src, imageIndex) => (
                    <div
                      key={src + imageIndex}
                      className={`relative overflow-hidden ${
                        imageIndex > 0 ? "hidden sm:block" : ""
                      }`}
                    >
                      <div
                        className="afrolove-hero-photo absolute inset-0 bg-cover bg-top"
                        style={{ backgroundImage: `url("${src}")` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="afrolove-hero-overlay-horizontal pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,11,0.94)_0%,rgba(5,7,11,0.86)_38%,rgba(5,7,11,0.52)_70%,rgba(5,7,11,0.68)_100%)]" />
          <div className="afrolove-hero-overlay-vertical pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,9,13,0.25)_0%,rgba(7,9,13,0.12)_46%,rgba(7,9,13,0.72)_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,76,76,0.22),transparent_30%),radial-gradient(circle_at_85%_75%,rgba(242,201,76,0.16),transparent_34%)]" />
          {/* AFROLOVE HERO SLIDESHOW TEST END */}
          <div className="afrolove-hero-copy-panel relative z-10 rounded-[24px] border border-white/[0.06] bg-black/25 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-[2px] sm:rounded-[28px] sm:p-7 lg:-ml-3 lg:p-8">
            <span className="inline-flex rounded-full border border-[#ff5252]/25 bg-[#ff5252]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#ffb2b2]">
              Premium pan-African dating
            </span>
            <h1 className="mt-5 max-w-2xl text-[42px] font-black leading-[0.94] tracking-[-0.045em] min-[390px]:text-[46px] sm:mt-6 sm:text-6xl sm:leading-[0.98] lg:text-7xl">
              Find your person. Across Africa and beyond.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-white/55 sm:mt-6 sm:text-lg sm:leading-7 sm:text-white/48">
              AfroLove brings Africans at home and across the diaspora together
              for genuine chemistry, shared culture and lasting commitment.
            </p>
            <div className="mt-7 grid gap-2 sm:mt-8 sm:flex sm:flex-wrap sm:gap-3">
              <Link
                href={user ? "/app" : "/register"}
                className="gold-shine w-full rounded-2xl bg-[#F2C94C] px-5 py-3.5 text-center text-sm font-black text-black sm:w-auto sm:px-7 sm:py-4"
              >
                {user ? "Continue matching" : "Create free account"}
              </Link>
              {!user && (
                <Link
                  href="/login"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3.5 text-center text-sm font-black text-white/70 sm:w-auto sm:px-7 sm:py-4"
                >
                  I already have an account
                </Link>
              )}
            </div>
            <div className="mt-7 grid max-w-xl grid-cols-3 gap-2 sm:mt-9 sm:gap-3">
              {[
                ["54+", "African countries"],
                ["Private", "By design"],
                ["Real", "Connections"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="min-w-0 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3 sm:p-4"
                >
                  <p className="truncate text-lg font-black text-[#F2C94C] sm:text-xl">{value}</p>
                  <p className="mt-1 text-[8px] font-bold uppercase leading-3 tracking-wide text-white/36 sm:text-[10px]">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 mx-auto hidden w-full max-w-md sm:block">
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
        <footer
          data-testid="landing-footer"
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 border-t border-white/[0.07] px-5 py-5 text-center text-[10px] font-bold text-white/35 sm:gap-x-5 sm:px-8 sm:text-[11px]"
        >
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
