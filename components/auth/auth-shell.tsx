import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen px-4 py-6 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-[#0d0f14]/95 shadow-[0_30px_120px_rgba(0,0,0,0.6)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden border-r border-white/10 p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(242,201,76,0.24),transparent_34%),radial-gradient(circle_at_80%_80%,rgba(77,163,255,0.12),transparent_36%)]" />
          <div className="relative">
            <Link href="/" className="text-xs font-black tracking-[0.34em] text-[#F2C94C]">
              NAIJA MATCH
            </Link>
            <p className="mt-3 max-w-sm text-4xl font-black leading-tight">
              Meaningful Nigerian connections, built with trust.
            </p>
          </div>
          <div className="relative grid gap-3">
            {["Verified profiles", "Privacy-first matching", "Premium Nigerian community"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-sm font-bold text-white/70 backdrop-blur">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2C94C] text-sm font-black text-black">✓</span>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center p-5 sm:p-8 lg:p-10">
          <div className="mx-auto w-full max-w-md">
            <Link href="/" className="inline-flex items-center gap-2 text-xs font-black tracking-[0.28em] text-[#F2C94C] lg:hidden">
              NAIJA MATCH
            </Link>
            <p className="mt-7 text-[10px] font-black uppercase tracking-[0.28em] text-[#F2C94C] lg:mt-0">{eyebrow}</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-white/45">{description}</p>
            <div className="mt-7">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
