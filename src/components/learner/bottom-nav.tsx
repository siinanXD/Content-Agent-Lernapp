"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/lernpfad", label: "Heute" },
  { href: "/wiederholung", label: "Wiederholung" },
  { href: "/pruefung", label: "Prüfung" },
  { href: "/profil", label: "Profil" },
];

/**
 * Untere Navigation (Figma 52:377, Variante 2026): dunkle Kachel mit Text-Einträgen.
 * Aktiv: orange Schrift, fetter und `aria-current` (nicht nur Farbe).
 */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Hauptnavigation"
      className="mx-4 mb-6 mt-auto flex rounded-[20px] bg-[var(--color-bg-hero)] px-2"
    >
      {items.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-12 flex-1 items-center justify-center rounded-[var(--radius-md)] px-1 text-[13px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-text-on-brand)] ${
              active
                ? "font-semibold text-[var(--color-accent-on-dark)]"
                : "font-medium text-[var(--color-text-soft-on-dark)]"
            }`}
            style={{ fontFamily: "var(--font-display)" }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
