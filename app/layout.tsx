import type { Metadata } from "next";
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
  keywords: [
    "African dating",
    "pan-African dating app",
    "African singles",
    "dating across Africa",
    "African diaspora dating",
    "AfroLove",
  ],
  icons: {
    icon: "/brand/afrolove-app-icon.png",
    apple: "/brand/afrolove-app-icon.png",
  },
  openGraph: {
    title: "AfroLove | One Africa. Real Connections.",
    description:
      "A premium pan-African dating experience built for genuine chemistry, culture and commitment.",
    type: "website",
    images: ["/brand/afrolove-logo-dark.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "AfroLove | One Africa. Real Connections.",
    description:
      "A premium pan-African dating experience for meaningful connections.",
    images: ["/brand/afrolove-logo-dark.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
