"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ExamIcon,
  PathIcon,
  ProfileIcon,
  RepeatIcon,
} from "@/components/ui/icons";

const items = [
  { href: "/lernpfad", label: "Lernpfad", Icon: PathIcon },
  { href: "/wiederholung", label: "Wiederholung", Icon: RepeatIcon },
  { href: "/pruefung", label: "Prüfung", Icon: ExamIcon },
  { href: "/profil", label: "Profil", Icon: ProfileIcon },
];

/** BottomNav (Figma 12:73): Icon + Label, aktiver Eintrag mit Markierung oben. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <div className="sticky bottom-0 z-10 mt-auto px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
    <nav
      aria-label="Hauptnavigation"
      className="flex overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-bg-hero)]"
    >
      {items.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-focus-ring)] ${
              active
                ? "text-[var(--color-brand-accent)]"
                : "text-[var(--color-text-soft-on-dark)]"
            }`}
            style={{ fontFamily: "var(--font-display)" }}
          >
            {active ? (
              <span
                aria-hidden="true"
                className="absolute inset-x-4 top-0 h-[3px] rounded-b-[var(--radius-sm)] bg-[var(--color-brand-accent)]"
              />
            ) : null}
            <Icon />
            {label}
          </Link>
        );
      })}
    </nav>
    </div>
  );
}
