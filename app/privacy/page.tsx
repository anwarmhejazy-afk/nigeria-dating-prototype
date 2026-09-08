import type { Metadata } from "next";
import { LegalSection, LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="Privacy"
      title="Privacy Policy"
      summary="This Privacy Policy explains how AfroLove collects, uses, stores and protects information when you create an account or use our dating, messaging, safety and membership features."
    >
      <LegalSection title="Information we collect">
        <p>AfroLove may collect registration information, profile details, photos, age or date-of-birth information, dating preferences, interactions, likes, matches, messages, verification information, subscription and transaction records, notification subscriptions, safety reports and other information you choose to provide.</p>
      </LegalSection>
      <LegalSection title="Sign-in and authentication">
        <p>You may sign in using email-based authentication or supported third-party sign-in services such as Google. When you use Google sign-in, AfroLove receives account information made available through the approved sign-in scopes, such as your email address, name and basic profile information. AfroLove does not receive your Google password.</p>
      </LegalSection>
      <LegalSection title="How we use information">
        <p>We use information to create and secure accounts, operate discovery and matching, enable messaging, provide memberships and paid features, deliver notifications, prevent fraud and abuse, investigate safety reports, improve the service and comply with legal obligations.</p>
      </LegalSection>
      <LegalSection title="Private conversations and safety reports">
        <p>AfroLove does not make private conversations publicly visible. Where a member submits a safety report, relevant evidence included with that report may be made available to authorised moderators so they can investigate and take appropriate action.</p>
      </LegalSection>
      <LegalSection title="Location and profile visibility">
        <p>AfroLove may use location information that a member enters, such as country, region or city, to support discovery and matching. Members should not publish an exact home address or other unnecessarily sensitive location details in their profile.</p>
      </LegalSection>
      <LegalSection title="Notifications and device information">
        <p>If you enable browser or device notifications, AfroLove may receive a notification subscription endpoint, encryption keys and related device information needed to deliver those notifications. You can disable notifications through your device, browser or available AfroLove settings.</p>
      </LegalSection>
      <LegalSection title="Payments and service providers">
        <p>AfroLove may use third-party providers for services such as authentication, hosting, email delivery, analytics and payment processing. Those providers may process information only as needed to provide their services and are subject to their own privacy and security obligations. Payment card or account credentials handled directly by a payment provider are not stored by AfroLove unless expressly stated.</p>
      </LegalSection>
      <LegalSection title="How information is shared">
        <p>Profile information intended for discovery may be shown to other members according to AfroLove&apos;s product settings. We may also share information with service providers, legal authorities where required, or other parties where reasonably necessary to protect members, investigate abuse, enforce our Terms or comply with law.</p>
      </LegalSection>
      <LegalSection title="Data retention">
        <p>We retain information for as long as reasonably necessary to provide the service, maintain account and transaction records, protect members, prevent fraud, resolve disputes and comply with legal obligations. Safety evidence and audit records may be retained after account closure where reasonably necessary for those purposes.</p>
      </LegalSection>
      <LegalSection title="Access, correction and deletion">
        <p>You may update certain profile and account information through AfroLove. You may also request access, correction or deletion of personal information by using available account controls or contacting support@afroloveapp.com. Some information may be retained where required for security, fraud prevention, dispute resolution or legal compliance.</p>
      </LegalSection>
      <LegalSection title="Security">
        <p>We use reasonable technical and organisational measures designed to protect personal information. No online service can guarantee absolute security, so members should also protect their account credentials and report suspicious activity promptly.</p>
      </LegalSection>
      <LegalSection title="Adults only">
        <p>AfroLove is intended only for adults aged 18 and over. We do not knowingly permit people under 18 to create accounts.</p>
      </LegalSection>
      <LegalSection title="Changes to this policy">
        <p>We may update this Privacy Policy as AfroLove evolves or when legal or operational requirements change. Material updates may be communicated through the app, website or other appropriate means.</p>
      </LegalSection>
      <LegalSection title="Contact">
        <p>Questions or privacy requests can be sent to support@afroloveapp.com.</p>
      </LegalSection>
    </LegalShell>
  );
}
