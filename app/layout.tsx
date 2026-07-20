import type { Metadata, Viewport } from "next";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: {
    default: "AfroLove | Pan-African Dating",
    template: "%s | AfroLove",
  },
  description:
    "AfroLove is a premium pan-African dating experience for meaningful connections across Africa and the diaspora.",
  applicationName: "AfroLove",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AfroLove",
  },
  formatDetection: { telephone: false },
  keywords: [
    "African dating",
    "pan-African dating app",
    "African singles",
    "dating across Africa",
    "African diaspora dating",
    "AfroLove",
  ],
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  openGraph: {
    title: "AfroLove | One Africa. Real Connections.",
    description:
      "A premium pan-African dating experience built for genuine chemistry, culture and commitment.",
    type: "website",
    images: ["/opengraph-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "AfroLove | One Africa. Real Connections.",
    description:
      "A premium pan-African dating experience for meaningful connections.",
    images: ["/twitter-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#07080b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <PwaProvider>{children}</PwaProvider>
      </body>
    </html>
  );
}
