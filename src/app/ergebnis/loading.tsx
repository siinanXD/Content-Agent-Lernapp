import { MobileShell } from "@/components/learner/mobile-shell";
import { StateView } from "@/components/ui/state-view";

/** Screen 17 „Laden“: feste Mindesthöhe, damit beim Einblenden nichts springt (SIN-403). */
export default function Loading() {
  return (
    <MobileShell>
      <main aria-busy="true" className="flex min-h-[480px] flex-1 flex-col justify-center px-6 py-16">
        <h1 className="sr-only">Ergebnis</h1>
        <StateView kind="laden" title="Ergebnis wird geladen" />
      </main>
    </MobileShell>
  );
}
