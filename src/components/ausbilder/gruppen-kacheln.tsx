import Link from "next/link";
import { formatDate } from "@/lib/ausbilder/overview";
import {
  archivZeitraum,
  belegtProzent,
  freiText,
  teilnehmendeText,
  vergebenText,
  type GroupSummary,
  type Zugaenge,
} from "@/lib/ausbilder/gruppen";

export const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";

/** Textaktion in einer Kachel: Ziel ≥ 44 px, sichtbarer Fokus. */
const aktion = `inline-flex min-h-11 items-center text-sm ${focusRing}`;

/** Hauptkachel „Azubi-Zugänge“ (Figma G5): x von y vergeben, Balken, Rest frei. */
export function ZugaengeKachel({ zugaenge }: { zugaenge: Zugaenge }) {
  return (
    <section aria-label="Azubi-Zugänge" className="bento-tile bento-main">
      <p className="bento-label">Azubi-Zugänge</p>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-[28px] font-bold leading-9" style={{ fontFamily: "var(--font-mono)" }}>
          {vergebenText(zugaenge)}
        </span>
        <span className="text-sm text-[var(--color-text-soft-on-dark)]">vergeben</span>
      </p>
      <div
        role="progressbar"
        aria-label="Vergebene Azubi-Zugänge"
        aria-valuemin={0}
        aria-valuemax={zugaenge.memberQuota}
        aria-valuenow={zugaenge.used}
        className="h-1.5 w-full overflow-hidden rounded-[3px] bg-[var(--color-track-on-dark)]"
      >
        <div
          className="h-full rounded-[3px] bg-[var(--color-brand-accent)]"
          style={{ width: `${belegtProzent(zugaenge)}%` }}
        />
      </div>
      <p className="text-[13px] leading-[17px] text-[var(--color-text-soft-on-dark)]">{freiText(zugaenge)}</p>
    </section>
  );
}

function Balken({ percent }: { percent: number }) {
  return (
    <div
      role="progressbar"
      aria-label="Durchschnittlicher Fortschritt"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-1.5 w-full overflow-hidden rounded-[3px] bg-[var(--color-border-subtle)]"
    >
      <div className="h-full rounded-[3px] bg-[var(--color-brand-primary)]" style={{ width: `${percent}%` }} />
    </div>
  );
}

function Kopf({ g, archiv }: { g: GroupSummary; archiv: boolean }) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="truncate text-[15px] font-semibold leading-5" style={{ fontFamily: "var(--font-display)" }}>
          {g.name}
        </h2>
        {archiv ? (
          <span className="bento-label">ARCHIV</span>
        ) : g.memberCount > 0 ? (
          <span className="text-[13px] font-medium text-[var(--color-text-secondary)]" style={{ fontFamily: "var(--font-mono)" }}>
            Ø {g.avgPercent} %
          </span>
        ) : null}
      </div>
    </>
  );
}

/** Aktive Gruppe (Figma G5): Öffnen oder Archivieren. */
export function GruppenKachel({ g, onArchivieren }: { g: GroupSummary; onArchivieren: (g: GroupSummary) => void }) {
  return (
    <li className="bento-tile !gap-3">
      <Kopf g={g} archiv={false} />
      <p className="text-sm leading-[18px] text-[var(--color-text-secondary)]">
        {g.schwerpunkt} · {teilnehmendeText(g.memberCount)}
      </p>
      <Balken percent={g.avgPercent} />
      <div className="flex items-center justify-between gap-2">
        <span className="bento-label">{g.startsOn ? `Start ${formatDate(g.startsOn)}` : ""}</span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onArchivieren(g)}
            aria-label={`${g.name} archivieren`}
            className={`${aktion} font-medium text-[var(--color-text-secondary)]`}
          >
            Archivieren
          </button>
          <Link
            href={`/ausbilder?gruppe=${g.id}`}
            aria-label={`${g.name} öffnen`}
            className={`${aktion} font-semibold text-[var(--color-brand-primary)]`}
          >
            Öffnen
          </Link>
        </div>
      </div>
    </li>
  );
}

/** Archivierte Gruppe (Figma G7): Ansehen oder Wiederherstellen. */
export function ArchivKachel({
  g,
  busy,
  onWiederherstellen,
}: {
  g: GroupSummary;
  busy: boolean;
  onWiederherstellen: (g: GroupSummary) => void;
}) {
  return (
    <li className="bento-tile !gap-3">
      <Kopf g={g} archiv />
      <p className="text-sm leading-[18px] text-[var(--color-text-secondary)]">{g.schwerpunkt}</p>
      <p className="bento-label">{archivZeitraum(g)}</p>
      <p className="text-sm leading-[18px]">
        {teilnehmendeText(g.memberCount)}
        {g.memberCount > 0 ? ` · Ø ${g.avgPercent} %` : ""}
      </p>
      <div className="flex items-center justify-end gap-4">
        <Link
          href={`/ausbilder?gruppe=${g.id}`}
          aria-label={`${g.name} ansehen`}
          className={`${aktion} font-medium text-[var(--color-text-secondary)]`}
        >
          Ansehen
        </Link>
        <button
          type="button"
          disabled={busy}
          onClick={() => onWiederherstellen(g)}
          aria-label={`${g.name} wiederherstellen`}
          className={`${aktion} font-semibold text-[var(--color-brand-primary)] disabled:opacity-50`}
        >
          Wiederherstellen
        </button>
      </div>
    </li>
  );
}
