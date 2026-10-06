import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { A11yProvider } from "@/components/a11y/a11y-provider";
import { ServiceWorkerRegister } from "@/components/a11y/service-worker-register";
import { ProgressSync } from "@/components/a11y/progress-sync";
import { PostHogProvider } from "@/components/analytics/posthog-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Content-Agent-Lernapp",
  description:
    "Autonomer Kurs-Generator aus amtlichen Ausbildungsquellen — Pilot MAF.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Lernapp",
  },
};

// Metadaten-Feld `themeColor` ist veraltet; Wert = brand-primary (Meta-Tag kann kein CSS-Token lesen).
export const viewport: Viewport = {
  themeColor: "#C2410C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)]">
        <PostHogProvider>
          <A11yProvider>
            <ServiceWorkerRegister />
            <ProgressSync />
            {children}
          </A11yProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
