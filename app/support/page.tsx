import Link from "next/link";

import {
  supportContact,
} from "@/lib/support-contact";

export const metadata = {
  title: "Help & Support | AfroLove",
  description:
    "Contact AfroLove support for account, billing and technical assistance.",
};

function mailLink(subject: string) {
  return `mailto:${supportContact.email}?subject=${encodeURIComponent(
    subject,
  )}`;
}

export default function SupportPage() {
  const whatsappLink =
    supportContact.whatsappDigits
      ? `https://wa.me/${supportContact.whatsappDigits}?text=${encodeURIComponent(
          "Hello AfroLove Support, I need assistance with my account.",
        )}`
      : null;

  return (
    <main className="min-h-screen bg-[#080a0f] px-4 py-8 text-white">
      <section className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#F2C94C]">
              AfroLove support
            </p>
            <h1 className="mt-2 text-3xl font-black">
              How can we help?
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
              Contact the support team for account access,
              billing questions, technical problems or general
              assistance.
            </p>
          </div>

          <Link
            href="/app?tab=profile"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white/65"
          >
            Back to AfroLove
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <a
            href={mailLink("AfroLove account support")}
            className="rounded-3xl border border-[#F2C94C]/20 bg-[#F2C94C]/[0.055] p-5 transition hover:bg-[#F2C94C]/10"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F2C94C]">
              Email support
            </p>
            <h2 className="mt-3 text-xl font-black">
              {supportContact.email}
            </h2>
            <p className="mt-2 text-xs leading-5 text-white/45">
              Best for account access, technical issues,
              billing questions and detailed requests.
            </p>
          </a>

          {whatsappLink ? (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.055] p-5 transition hover:bg-emerald-400/10"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                WhatsApp support
              </p>
              <h2 className="mt-3 text-xl font-black">
                Start a support chat
              </h2>
              <p className="mt-2 text-xs leading-5 text-white/45">
                Opens the official support conversation in
                WhatsApp.
              </p>
            </a>
          ) : (
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                WhatsApp support
              </p>
              <h2 className="mt-3 text-xl font-black text-white/55">
                Not currently available
              </h2>
              <p className="mt-2 text-xs leading-5 text-white/35">
                Please contact the support team by email.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <a
            href={mailLink("AfroLove billing support")}
            className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 transition hover:border-white/15"
          >
            <h2 className="text-base font-black">
              Billing help
            </h2>
            <p className="mt-2 text-xs leading-5 text-white/40">
              Membership, test payments and transaction questions.
            </p>
          </a>

          <a
            href={mailLink("AfroLove technical support")}
            className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 transition hover:border-white/15"
          >
            <h2 className="text-base font-black">
              Technical help
            </h2>
            <p className="mt-2 text-xs leading-5 text-white/40">
              Login, verification, notifications, chat or app problems.
            </p>
          </a>

          <Link
            href="/safety"
            className="rounded-3xl border border-red-400/15 bg-red-400/[0.035] p-5 transition hover:bg-red-400/[0.07]"
          >
            <h2 className="text-base font-black text-red-200">
              Safety concern
            </h2>
            <p className="mt-2 text-xs leading-5 text-red-100/40">
              Use the in-app report and block tools for member safety issues.
            </p>
          </Link>
        </div>

        <div className="mt-6 rounded-3xl border border-blue-400/15 bg-blue-400/[0.045] p-5">
          <h2 className="text-sm font-black text-blue-100">
            Protect your account
          </h2>
          <p className="mt-2 text-xs leading-5 text-blue-100/45">
            AfroLove support will never ask for your password,
            one-time verification code, complete bank-card
            details or private identity documents through
            WhatsApp or email.
          </p>
        </div>
      </section>
    </main>
  );
}
