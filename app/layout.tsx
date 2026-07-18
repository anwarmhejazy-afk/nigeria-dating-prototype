import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NAIJA MATCH | Premium Nigerian Dating",
  description:
    "A premium Nigerian dating app prototype designed for meaningful connections.",
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
