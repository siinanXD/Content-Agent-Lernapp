import type { Metadata } from "next";
import { Geist_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import { A11yProvider } from "@/components/a11y/a11y-provider";
import { ServiceWorkerRegister } from "@/components/a11y/service-worker-register";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
  themeColor: "#0B5F6E",
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
      className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)]">
        <A11yProvider>
          <ServiceWorkerRegister />
          {children}
        </A11yProvider>
      </body>
    </html>
  );
}
