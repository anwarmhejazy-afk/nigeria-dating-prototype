import type { Metadata } from "next";
import Link from "next/link";
import { LegalSection, LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = { title: "Safety Centre" };

export default function SafetyPage() {
  return (
    <LegalShell eyebrow="Protection" title="AfroLove Safety Centre" summary="Practical guidance for safer conversations, meetings, reporting and account protection.">
      <LegalSection title="Before meeting"><p>Video chat first, meet in a public place, arrange your own transport and share your plans with someone you trust.</p></LegalSection>
      <LegalSection title="Financial safety"><p>Never send money, crypto, gift cards, bank details, one-time passwords or copies of identity documents to a match.</p></LegalSection>
      <LegalSection title="Report, block or unmatch"><p>Inside a conversation, open the three-dot menu to report selected messages, block the member or close the match. Moderators receive only the evidence submitted with the report.</p></LegalSection>
      <LegalSection title="Immediate danger"><p>If you believe someone is in immediate danger or a crime is taking place, contact the appropriate local emergency service or law-enforcement authority.</p></LegalSection>
      <LegalSection title="Account security"><p>Use a unique password, keep your email account secure and sign out of shared devices. AfroLove staff will never ask for your password.</p></LegalSection>
      <Link href="/community-guidelines" className="inline-flex rounded-2xl bg-[#F2C94C] px-5 py-3 text-sm font-black text-black">Read the Community Guidelines</Link>
    </LegalShell>
  );
}
