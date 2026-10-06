import { MobileShell } from "@/components/learner/mobile-shell";
import { StateView } from "@/components/ui/state-view";

/** Zustand „Laden“ (Figma W10/17): erscheint nur, solange der Lernpfad beim Navigieren noch aufgebaut wird. */
export default function LernpfadLoading() {
  return (
    <MobileShell>
      <main className="flex flex-1 flex-col gap-3.5 px-4 pt-11">
        <h1 className="sr-only">Heute</h1>
        <StateView kind="laden" title="Dein Lernpfad wird geladen" />
      </main>
    </MobileShell>
  );
}
