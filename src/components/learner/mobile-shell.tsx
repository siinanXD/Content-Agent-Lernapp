import type { ReactNode } from "react";

/** Centers the Figma 390 mobile composition on larger viewports. */
export function MobileShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-full flex-1 justify-center bg-[var(--color-bg-canvas)]">
      <div
        className={`flex w-full max-w-[390px] min-h-full flex-col bg-[var(--color-bg-canvas)] shadow-[0_0_0_1px_var(--color-border-subtle)] ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
