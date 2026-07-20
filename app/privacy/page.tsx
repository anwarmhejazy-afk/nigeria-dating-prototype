import type { Metadata } from "next";
import { LegalSection, LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalShell eyebrow="Privacy" title="Privacy Policy" summary="How AfroLove handles account, profile, matching, messaging, safety and device information.">
      <LegalSection title="Information we collect">
        <p>AfroLove stores registration information, profile details, photos, dating preferences, interactions, matches, messages, device notification subscriptions and safety reports that members choose to submit.</p>
      </LegalSection>
      <LegalSection title="How information is used">
        <p>We use data to operate authentication, discovery, matching, messaging, moderation, verification, notifications, fraud prevention and platform analytics.</p>
      </LegalSection>
      <LegalSection title="Private conversations and safety reports">
        <p>Administrators cannot casually browse unrelated private conversations. When a member files a safety report, only the evidence deliberately submitted with that report becomes available to authorised moderators.</p>
      </LegalSection>
      <LegalSection title="Location and profile visibility">
        <p>AfroLove uses the country, region and city that a member enters. Members should never publish an exact home address. Staff-only accounts are excluded from dating discovery.</p>
      </LegalSection>
      <LegalSection title="Notifications and device data">
        <p>When enabled, the browser provides AfroLove with a push-subscription endpoint and encryption keys. These are used only to deliver notifications and can be removed by disabling notifications.</p>
      </LegalSection>
      <LegalSection title="Retention and account requests">
        <p>Safety evidence and audit records may be retained where reasonably necessary to protect members and enforce platform rules. Future production releases should provide formal access, correction and deletion request procedures.</p>
      </LegalSection>
    </LegalShell>
  );
}
