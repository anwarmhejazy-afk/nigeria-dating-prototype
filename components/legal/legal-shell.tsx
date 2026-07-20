import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

export function LegalShell({
  eyebrow,
  title,
  summary,
  children,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <section className="mx-auto max-w-4xl overflow-hidden rounded-[32px] border border-white/10 bg-[#0d0f14]/95 shadow-[0_0_90px_rgba(242,201,76,0.12)]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-8">
          <BrandLogo href="/" size="md" showTagline />
          <div className="flex gap-2 text-xs font-bold text-white/50">
            <Link href="/" className="rounded-full border border-white/10 px-4 py-2 hover:text-white">Home</Link>
            <Link href="/safety" className="rounded-full border border-white/10 px-4 py-2 hover:text-white">Safety</Link>
          </div>
        </header>
        <div className="px-5 py-10 sm:px-10 sm:py-14">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#F2C94C]">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">{summary}</p>
          <div className="legal-copy mt-10 space-y-8">{children}</div>
        </div>
        <footer className="border-t border-white/10 px-5 py-6 text-xs text-white/35 sm:px-10">
          AfroLove prototype legal information. Review with qualified counsel before a public commercial launch.
        </footer>
      </section>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-black text-[#FFE58C]">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-white/55">{children}</div>
    </section>
  );
}
