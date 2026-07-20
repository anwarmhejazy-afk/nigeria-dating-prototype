import type { Metadata } from "next";
import { LegalSection, LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = { title: "Terms and Conditions" };

export default function TermsPage() {
  return (
    <LegalShell eyebrow="Terms" title="Terms and Conditions" summary="The basic rules for using the AfroLove prototype responsibly and safely.">
      <LegalSection title="Adults only"><p>You must be at least 18 years old to register, create a profile or communicate with members.</p></LegalSection>
      <LegalSection title="Genuine accounts"><p>Members must use truthful information and photos they have the right to upload. Impersonation, fake identities and misleading profiles are prohibited.</p></LegalSection>
      <LegalSection title="Respectful conduct"><p>Harassment, racism, hate speech, threats, sexual coercion, scams, financial solicitation, spam and illegal content are prohibited.</p></LegalSection>
      <LegalSection title="Safety"><p>Never send money, banking credentials, identity documents or private security codes to another member. Meet in public and tell someone you trust where you are going.</p></LegalSection>
      <LegalSection title="Moderation"><p>AfroLove may warn, restrict, suspend or ban accounts based on safety evidence, repeated complaints, fraud indicators or serious rule violations.</p></LegalSection>
      <LegalSection title="Prototype status"><p>The current product is an MVP/prototype. Features, availability, pricing and policies may change before commercial launch.</p></LegalSection>
    </LegalShell>
  );
}
