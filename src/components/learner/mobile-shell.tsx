import type { ReactNode } from "react";
import { BottomNav } from "@/components/learner/bottom-nav";
import { DemoHinweis } from "@/components/learner/demo-hinweis";

/**
 * Gemeinsamer Seitenrahmen (SIN-1448): höchstens 390 px, am Desktop mittig; Seiten setzen 16 px Rand (Inhalt 358 px).
 * `wide` nur für die Desktop-Frames aus Figma: `/` (A3), `/ausbilder` (W11), `/admin` (X1).
 * `nav` zeigt die Hauptnavigation fest am unteren Rand des Rahmens (alle Seiten nach der Anmeldung).
 */
export function MobileShell({
  children,
  className = "",
  wide = false,
  nav = false,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
  nav?: boolean;
}) {
  return (
    <div className="flex min-h-full justify-center bg-[var(--color-bg-canvas)]">
      <div
        className={`flex w-full max-w-[390px] min-h-full flex-col bg-[var(--color-bg-canvas)] shadow-[0_0_0_1px_var(--color-border-subtle)] ${wide ? "md:max-w-[1120px]" : ""} ${className}`}
      >
        <DemoHinweis />
        {children}
        {nav ? <BottomNav /> : null}
      </div>
    </div>
  );
}
