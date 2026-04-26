import type { Metadata } from "next";
import { publicEnv } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_SITE_URL),
  title: {
    default: "Cofoundr — your AI co-founder",
    template: "%s · Cofoundr",
  },
  description:
    "Cofoundr is the AI co-founder that helps you launch, run, and grow any business — with guided workflows, generated documents, and an AI workforce.",
  openGraph: {
    title: "Cofoundr — your AI co-founder",
    description:
      "Build, launch, run, and grow any business with the leverage of an entire team. Powered by AI.",
    url: publicEnv.NEXT_PUBLIC_SITE_URL,
    siteName: "Cofoundr",
    locale: "en_CA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cofoundr — your AI co-founder",
    description:
      "Build, launch, run, and grow any business with the leverage of an entire team.",
  },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
