import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <section className="w-full max-w-md rounded-[32px] border border-white/10 bg-[#0d0f14] p-7 text-center shadow-2xl">
        <BrandLogo href="/" size="md" showTagline />
        <div className="mx-auto mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-[#F2C94C]/10 text-3xl">☁</div>
        <h1 className="mt-5 text-3xl font-black">You are offline</h1>
        <p className="mt-3 text-sm leading-6 text-white/45">Check your internet connection. AfroLove will reconnect automatically when your device is online.</p>
        <Link href="/app" className="mt-6 inline-flex rounded-2xl bg-[#F2C94C] px-6 py-3 text-sm font-black text-black">Try again</Link>
      </section>
    </main>
  );
}
