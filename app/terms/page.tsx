import type { Metadata } from "next";
import { LegalSection, LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "AfroLove Terms and Conditions",
  description:
    "Read the AfroLove Terms and Conditions covering accounts, profiles, matching, messaging, safety features, memberships and paid services.",
};

export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="Terms"
      title="Terms and Conditions"
      summary="These Terms govern your access to and use of AfroLove, including profiles, matching, messaging, safety features and paid services."
    >
      <LegalSection title="Eligibility">
        <p>You must be at least 18 years old to create or use an AfroLove account. By using AfroLove, you confirm that you are legally able to enter into these Terms and that your use of the service is permitted by applicable law.</p>
      </LegalSection>
      <LegalSection title="Accounts and profile information">
        <p>You are responsible for the accuracy of the information you provide and for keeping your account secure. You must not impersonate another person, create misleading or fraudulent profiles, share an account with another person, or upload content you do not have the right to use.</p>
      </LegalSection>
      <LegalSection title="Acceptable use">
        <p>Harassment, hate speech, threats, sexual coercion, exploitation, scams, financial solicitation, spam, impersonation, illegal activity and content that infringes another person&apos;s rights are prohibited. You must use AfroLove respectfully and in accordance with our Community Guidelines and Safety rules.</p>
      </LegalSection>
      <LegalSection title="Dating and personal safety">
        <p>AfroLove does not conduct background checks on every member and cannot guarantee another member&apos;s identity, intentions or conduct. Use good judgment when interacting with others. Do not send money, financial credentials, identity documents or security codes to another member. When meeting someone in person, use a public place and tell someone you trust where you are going.</p>
      </LegalSection>
      <LegalSection title="User content">
        <p>You retain ownership of content you submit to AfroLove. You grant AfroLove the limited rights necessary to host, display, process and transmit that content in order to operate the service, provide matching and messaging features, maintain safety and comply with legal obligations.</p>
      </LegalSection>
      <LegalSection title="Moderation and account action">
        <p>AfroLove may review safety reports and other relevant evidence and may warn, restrict, suspend or terminate accounts that violate these Terms, our policies, applicable law or the safety of other members. We may also remove content where reasonably necessary to protect users or operate the service.</p>
      </LegalSection>
      <LegalSection title="Subscriptions and paid features">
        <p>AfroLove may offer paid memberships, boosts or other paid features. Prices, billing periods and included benefits will be shown before purchase. Payments may be processed by third-party payment providers and are also subject to the provider&apos;s applicable terms.</p>
        <p>Recurring subscriptions continue until cancelled. Where applicable, cancellation stops future renewal but does not normally end access already paid for during the current billing period. Refund rights, if any, are subject to applicable law and the terms presented at purchase.</p>
      </LegalSection>
      <LegalSection title="Privacy">
        <p>Your use of AfroLove is also governed by our Privacy Policy, which explains how we collect, use, store and protect information associated with your account and use of the service.</p>
      </LegalSection>
      <LegalSection title="Service availability and changes">
        <p>We may update, add, remove or change features from time to time. We do not guarantee that every feature will always be available or uninterrupted, but we will take reasonable steps to operate AfroLove securely and reliably.</p>
      </LegalSection>
      <LegalSection title="Disclaimer">
        <p>AfroLove provides a platform for adults to discover and communicate with other members. We do not guarantee matches, relationships, compatibility, identity, conduct or outcomes arising from interactions between members.</p>
      </LegalSection>
      <LegalSection title="Limitation of liability">
        <p>To the fullest extent permitted by applicable law, AfroLove will not be liable for indirect, incidental, special or consequential losses arising from use of the service or interactions with other members. Nothing in these Terms excludes liability that cannot legally be excluded or limited.</p>
      </LegalSection>
      <LegalSection title="Ending your account">
        <p>You may stop using AfroLove at any time and may request account deletion through the available account controls or by contacting us. We may retain limited information where reasonably necessary for security, fraud prevention, dispute resolution or legal compliance.</p>
      </LegalSection>
      <LegalSection title="Changes to these Terms">
        <p>We may update these Terms from time to time. When material changes are made, we may provide notice through the app, website or other appropriate means. Continued use of AfroLove after updated Terms take effect means you accept the revised Terms.</p>
      </LegalSection>
      <LegalSection title="Contact">
        <p>Questions about these Terms can be sent to support@afroloveapp.com.</p>
      </LegalSection>
    </LegalShell>
  );
}
