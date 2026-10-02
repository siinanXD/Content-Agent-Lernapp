"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/lernpfad", label: "Lernpfad" },
  { href: "/profil", label: "Profil" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Hauptnavigation"
      className="sticky bottom-0 mt-auto flex border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]"
    >
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-h-12 flex-1 items-center justify-center text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-focus-ring)] ${
              active
                ? "text-[var(--color-brand-primary)]"
                : "text-[var(--color-text-secondary)]"
            }`}
            style={{ fontFamily: "var(--font-display)" }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
