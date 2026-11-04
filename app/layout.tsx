import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "AuraEstate Premier Properties — Luxury Homes & 24/7 AI Concierge",
  description:
    "Find your dream property in less time. Curated luxury villas, penthouses and apartments in Beverly Hills, Miami, Austin, Manhattan and London.",
  openGraph: {
    title: "AuraEstate Premier Properties",
    description: "Luxury real estate with a 24/7 AI lead concierge.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
