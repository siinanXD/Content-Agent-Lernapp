"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { archivierenFolgen, teilnehmendeText, type GroupSummary } from "@/lib/ausbilder/gruppen";

/**
 * Gruppe archivieren · Bestätigung (Figma G6). Natives `<dialog>`: Fokus bleibt im Dialog,
 * Esc bricht ab. Nichts wird gelöscht; die Folgen stehen vor der Bestätigung.
 */
export function ArchiveSheet({
  group,
  mitKontingent,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  group: GroupSummary;
  mitKontingent: boolean;
  busy: boolean;
  error: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="archivieren-titel"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
      className="archive-sheet m-auto w-[min(calc(100%-2rem),420px)] rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6 text-[var(--color-text-primary)]"
    >
      <div className="flex flex-col gap-4">
        <p className="bento-label">Gruppe archivieren</p>
        <h2
          id="archivieren-titel"
          className="text-xl font-bold leading-7"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {group.name} ins Archiv verschieben?
        </h2>
        <p className="text-sm leading-[18px] text-[var(--color-text-secondary)]">
          {group.schwerpunkt} · {teilnehmendeText(group.memberCount)}
        </p>
        <ul className="flex flex-col gap-1.5 text-sm leading-[18px]">
          {archivierenFolgen(group.memberCount, mitKontingent).map((t) => (
            <li key={t}>– {t}</li>
          ))}
        </ul>
        <p role="alert" className="min-h-5 text-sm text-[var(--color-feedback-danger)]">
          {error}
        </p>
        <div className="flex flex-col gap-2.5">
          <Button onClick={onConfirm} disabled={busy}>
            {busy ? "Wird archiviert …" : "Archivieren"}
          </Button>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Abbrechen
          </Button>
        </div>
      </div>
    </dialog>
  );
}
