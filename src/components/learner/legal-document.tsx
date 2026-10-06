import Link from "next/link";
import { Fragment } from "react";
import { MobileShell } from "@/components/learner/mobile-shell";
import type { Inline, LegalDocument as Doc } from "@/lib/legal/legal-content";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";

function Inlines({ parts }: { parts: Inline[] }) {
  return parts.map((p, i) => {
    if (p.type === "link") {
      return (
        <Link
          key={i}
          href={p.href}
          className={`text-[var(--color-brand-primary)] underline underline-offset-2 ${focusRing}`}
        >
          {p.text}
        </Link>
      );
    }
    if (p.type === "placeholder") {
      return (
        <mark
          key={i}
          className="rounded-[var(--radius-sm)] bg-[var(--color-bg-hint)] text-[var(--color-text-hint)]"
        >
          {p.text}
        </mark>
      );
    }
    return <Fragment key={i}>{p.text}</Fragment>;
  });
}

/** Screens 27–29 (Impressum, Datenschutzerklärung, Hinweis zu KI-Inhalten): Text aus `content/legal/*.md`. */
export function LegalDocument({ doc }: { doc: Doc }) {
  const headings = doc.blocks.flatMap((b) => (b.type === "heading" ? [b] : []));
  return (
    <MobileShell>
      <main className="flex flex-1 flex-col gap-3.5 px-5 pb-8 pt-10">
        <Link
          href="/"
          className={`inline-flex min-h-11 items-center self-start text-sm text-[var(--color-brand-primary)] underline underline-offset-4 ${focusRing}`}
        >
          Zur Startseite
        </Link>
        <h1
          className="text-[28px] font-bold leading-[36px] text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {doc.title}
        </h1>
        {doc.draft && doc.draftNote ? (
          <p
            role="note"
            className="rounded-[var(--radius-md)] bg-[var(--color-bg-hint)] px-3 py-2.5 text-xs font-medium leading-[15.6px] text-[var(--color-text-hint)]"
          >
            <strong className="font-semibold">Entwurf.</strong> {doc.draftNote}
          </p>
        ) : null}
        {doc.toc ? (
          <nav
            aria-label="Inhalt"
            className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-3.5"
          >
            <ul className="flex flex-col">
              {headings.map((h) => (
                <li key={h.id}>
                  <a
                    href={`#${h.id}`}
                    className={`flex min-h-11 items-center text-sm font-medium text-[var(--color-brand-primary)] ${focusRing}`}
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        {doc.blocks.map((b, i) => {
          if (b.type === "heading") {
            return (
              <h2
                key={i}
                id={b.id}
                className="-mb-2.5 scroll-mt-4 text-base font-semibold leading-[20.8px] text-[var(--color-text-primary)]"
              >
                {b.text}
              </h2>
            );
          }
          if (b.type === "cards") {
            return (
              <ul key={i} className="flex flex-col gap-1.5">
                {b.items.map((c) => (
                  <li
                    key={c.name}
                    className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 py-2.5"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold leading-[18.2px] text-[var(--color-text-primary)]">
                        {c.name}
                      </span>
                      <span className="text-[13px] leading-[16.9px] text-[var(--color-text-secondary)]">
                        {c.purpose}
                      </span>
                    </div>
                    <span
                      className="shrink-0 text-xs font-medium leading-[15.6px] text-[var(--color-text-secondary)]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      <Inlines parts={c.region} />
                    </span>
                  </li>
                ))}
              </ul>
            );
          }
          return (
            <p key={i} className="text-sm leading-[18.2px] text-[var(--color-text-secondary)]">
              {b.lines.map((line, j) => (
                <Fragment key={j}>
                  {j > 0 ? <br /> : null}
                  <Inlines parts={line} />
                </Fragment>
              ))}
            </p>
          );
        })}
      </main>
    </MobileShell>
  );
}
