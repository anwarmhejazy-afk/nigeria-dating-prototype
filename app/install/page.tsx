import type { Metadata } from "next";
import { LegalSection, LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = { title: "Install AfroLove" };

export default function InstallPage() {
  return (
    <LegalShell eyebrow="Mobile app" title="Install AfroLove" summary="Add AfroLove to your phone or computer for a standalone, app-like experience.">
      <LegalSection title="Android — Chrome or Edge"><p>Open AfroLove, tap the browser menu, then choose Install app or Add to Home screen. Confirm the installation and open the AfroLove icon.</p></LegalSection>
      <LegalSection title="iPhone or iPad — Safari"><p>Open AfroLove in Safari, tap Share, choose Add to Home Screen, then tap Add. Open AfroLove from the new home-screen icon before enabling notifications.</p></LegalSection>
      <LegalSection title="Desktop"><p>Chrome and Edge may show an install icon in the address bar. Select it to open AfroLove in a dedicated app window.</p></LegalSection>
      <LegalSection title="Notifications"><p>After installation, sign in and open Settings → Notification settings. Permission must be granted by the device browser.</p></LegalSection>
    </LegalShell>
  );
}
