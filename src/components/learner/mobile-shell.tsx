import type { ReactNode } from "react";

/** Centers the Figma 390 mobile composition on larger viewports; `wide` lets 2026 screens grow to desktop. */
export function MobileShell({
  children,
  className = "",
  wide = false,
}: {
  children: ReactNode;
  className?: string;
  /** Variante 2026: ab 768 px bis 1120 px breit (Startseite, Gruppenübersicht, Formulare, Rechtstexte). */
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-full justify-center bg-[var(--color-bg-canvas)]">
      <div
        className={`flex w-full max-w-[390px] min-h-full flex-col bg-[var(--color-bg-canvas)] shadow-[0_0_0_1px_var(--color-border-subtle)] ${wide ? "md:max-w-[1120px]" : ""} ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
