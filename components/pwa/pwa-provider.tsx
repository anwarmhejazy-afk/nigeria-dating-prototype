"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOSDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [online, setOnline] = useState(true);

  const publicConsentPath = useMemo(
    () => pathname === "/" || pathname === "/register",
    [pathname],
  );

  useEffect(() => {
    setInstalled(isStandalone());
    setOnline(window.navigator.onLine);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
    }

    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowInstallHelp(false);
    };
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);

    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!publicConsentPath) return;
    const accepted = window.localStorage.getItem("afrolove-consent-v1");
    if (!accepted) setShowConsent(true);
  }, [publicConsentPath]);

  const install = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstallPrompt(null);
      return;
    }
    setShowInstallHelp(true);
  };

  const acceptConsent = () => {
    window.localStorage.setItem(
      "afrolove-consent-v1",
      JSON.stringify({ adult: true, acceptedAt: new Date().toISOString() }),
    );
    setShowConsent(false);
  };

  return (
    <>
      {children}

      {!online && (
        <div className="fixed inset-x-0 top-0 z-[200] bg-amber-400 px-4 py-2 text-center text-xs font-black text-black shadow-lg">
          You are offline. AfroLove will reconnect automatically.
        </div>
      )}

      {!installed && pathname !== "/admin" && !pathname.startsWith("/admin/") && (
        <button
          type="button"
          onClick={() => void install()}
          className="fixed bottom-5 left-5 z-[120] rounded-full border border-[#F2C94C]/35 bg-[#18150d]/95 px-4 py-3 text-xs font-black text-[#FFE58C] shadow-2xl backdrop-blur-xl transition hover:bg-[#241f10]"
        >
          Install AfroLove
        </button>
      )}

      {showInstallHelp && (
        <div className="fixed inset-0 z-[220] flex items-end justify-center bg-black/75 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-[30px] border border-white/10 bg-[#101217] p-6 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#F2C94C]">
              Install AfroLove
            </p>
            <h2 className="mt-2 text-2xl font-black">Keep AfroLove on your phone</h2>
            <p className="mt-3 text-sm leading-6 text-white/50">
              {isIOSDevice()
                ? "On iPhone or iPad, tap the Share button in Safari, then choose Add to Home Screen. Open the installed icon to use notifications."
                : "Open your browser menu and choose Install app or Add to Home screen. AfroLove will open in its own app window."}
            </p>
            <div className="mt-5 grid gap-2">
              <Link
                href="/install"
                onClick={() => setShowInstallHelp(false)}
                className="rounded-2xl bg-[#F2C94C] px-4 py-3 text-center text-sm font-black text-black"
              >
                View installation guide
              </Link>
              <button
                type="button"
                onClick={() => setShowInstallHelp(false)}
                className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-white/60"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      {showConsent && publicConsentPath && (
        <div className="fixed inset-0 z-[230] flex items-end justify-center bg-black/80 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-[30px] border border-white/10 bg-[#101217] p-6 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#F2C94C]">
              18+ community
            </p>
            <h2 className="mt-2 text-2xl font-black">Confirm before continuing</h2>
            <p className="mt-3 text-sm leading-6 text-white/50">
              AfroLove is for adults aged 18 and over. We use essential browser storage to keep you signed in, protect accounts and remember app preferences.
            </p>
            <p className="mt-3 text-xs leading-5 text-white/38">
              By continuing, you confirm that you are at least 18 and agree to our{" "}
              <Link href="/terms" className="font-bold text-[#F2C94C]">Terms</Link>,{" "}
              <Link href="/privacy" className="font-bold text-[#F2C94C]">Privacy Policy</Link> and{" "}
              <Link href="/community-guidelines" className="font-bold text-[#F2C94C]">Community Guidelines</Link>.
            </p>
            <button
              type="button"
              onClick={acceptConsent}
              className="mt-5 w-full rounded-2xl bg-[#F2C94C] py-4 text-sm font-black text-black"
            >
              I am 18 or older — continue
            </button>
          </div>
        </div>
      )}
    </>
  );
}
