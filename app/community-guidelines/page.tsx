import type { Metadata } from "next";
import { LegalSection, LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = { title: "Community Guidelines" };

export default function CommunityGuidelinesPage() {
  return (
    <LegalShell eyebrow="Community" title="Community Guidelines" summary="AfroLove is designed for genuine, respectful and culturally inclusive connections.">
      <LegalSection title="Be genuine"><p>Use recent photos, accurate personal information and honest relationship intentions.</p></LegalSection>
      <LegalSection title="Respect boundaries"><p>Stop messaging when someone says no, withdraws consent, blocks you or asks to end the conversation.</p></LegalSection>
      <LegalSection title="No hate or harassment"><p>Do not attack people based on race, ethnicity, nationality, culture, religion, gender, disability or any protected characteristic.</p></LegalSection>
      <LegalSection title="No commercial pressure"><p>Do not use AfroLove to sell products, recruit for schemes, request investments, exchange currency or pressure members into business transactions.</p></LegalSection>
      <LegalSection title="Protect the community"><p>Use the report tool when you encounter harmful behaviour. Submit only the evidence needed for moderators to review the concern.</p></LegalSection>
    </LegalShell>
  );
}
