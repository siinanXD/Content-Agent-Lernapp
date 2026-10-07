/**
 * `/start` leitet ohne Cookie `cal-onboarded` serverseitig hierher (next.config.ts, SIN-345).
 * Wer die Einwilligung schon beantwortet hat (nur das Cookie fehlte), geht vor dem ersten Bild zurück.
 */
const BACK_TO_START =
  'if(document.documentElement.dataset.consent==="decided")location.replace("/start")';

export default function WillkommenLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: BACK_TO_START }} />
      {children}
    </>
  );
}
