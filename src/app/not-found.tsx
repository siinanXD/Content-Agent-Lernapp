import Link from "next/link";
import { MobileShell } from "@/components/learner/mobile-shell";
import { StateView } from "@/components/ui/state-view";

/** Screen 17 „Leer“: unbekannte Adresse mit Weg zurück zum Lernpfad (SIN-403). */
export default function NotFound() {
  return (
    <MobileShell>
      <main className="flex flex-1 flex-col gap-4 px-6 py-16">
        <StateView
          kind="leer"
          heading
          title="Diese Seite gibt es nicht"
          text="Die Adresse stimmt nicht oder die Seite wurde entfernt."
        >
          <Link
            href="/lernpfad"
            className="flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-primary)] px-4 text-sm font-medium text-[var(--color-text-on-brand)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          >
            Zum Lernpfad
          </Link>
        </StateView>
      </main>
    </MobileShell>
  );
}
