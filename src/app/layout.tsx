import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { A11yProvider } from "@/components/a11y/a11y-provider";
import { ServiceWorkerRegister } from "@/components/a11y/service-worker-register";
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
  themeColor: "#C2410C",
  appleWebApp: {
    capable: true,
    title: "Lernapp",
  },
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
            {children}
          </A11yProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
