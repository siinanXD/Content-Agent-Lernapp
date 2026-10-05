# SIN-249: Einheit öffnen robust, „Referenzberuf“ wird „Dein Betrieb“

- Issue: https://linear.app/sinan-kahraman/issue/SIN-249/bug-fehler-beim-offnen-von-einheiten-im-lernpfad-referenzberuf
- Quellen: [MaschFüAusbV § 2, § 10](https://www.gesetze-im-internet.de/maschf_ausbv/), Curriculum-Maps `docs/content/MAF-METALL.md`, `MAF-KUNSTSTOFF.md`, `MAF-DRUCKVERARBEITUNG.md`, `MAF-PACKMITTEL.md`

## Entscheidung

1. **Einheit öffnen.** `mapGeneratedToPathUnits` verträgt fehlende Felder aus Supabase (`sourceUrl`, `minutes`, `explanation`, Fragen-Felder) und lässt Einheiten ohne Id, Titel oder Fragen aus. Ein leeres Ergebnis überschreibt den Cache nicht. Die Einheitenseite dekodiert die URL-Id (`decodeURIComponent`). Neu: `src/app/einheit/[unitId]/error.tsx` zeigt Screen 17 „Fehler“ (Erneut versuchen, Zum Lernpfad) und meldet an Sentry, statt abzustürzen. Fehlt eine Einheit, bleibt „Einheit nicht gefunden“.
2. **Schwerpunkt-Screen.** Die zweite Auswahl ist keine Anrechnung oder Weiterführung. Sie wählt die Curriculum-Map, also welcher Referenz-Rahmenlehrplan als Vorlage für die Berufsschul-Themen dient (z. B. Metall: Industriemechaniker; Kunststoff: Kunststoff- und Kautschuktechnologe). Der Kurs bleibt in beiden Fällen Maschinen- und Anlagenführer/in; die Fortsetzung nach § 10 modellieren die Maps nicht (D-26). Der Abschnitt heißt jetzt „Dein Betrieb“ mit Optionen „Metallbetrieb“ / „Kunststoffbetrieb“ (analog Druck/Packmittel) und einem Erklärsatz. Der Referenzberuf bleibt als Feld im Code, wird Lernenden aber nicht mehr gezeigt.

## Annahmen

- Die Produktionsdaten waren im Cloud-Agent nicht abrufbar (keine Supabase-Keys, `phase-a-published.json` enthält keine Einheiten). Die genaue Ursache des Fehlers in Production ist daher **nicht bestätigt**. Plausible Auslöser, die jetzt abgedeckt sind: fehlende Felder in gespeicherten Einheiten (Absturz beim Mapping), URL-kodierte Ids, Einheit nicht im Cache nach Wechsel zwischen Seed und Supabase-Daten. Sinan bitte in Production auf dem iPhone prüfen. Falls der Fehler bleibt: Browser-Konsole/Netzwerk-Antwort von `/api/learner/phase-a` zeigen.
- Der E2E-Test mockt die Antwort von `/api/learner/phase-a` in der Form der Supabase-Daten. Ein Test gegen die echte Datenbank braucht Secrets in der CI und ist offen.
- Neue Texte nutzen nur vorhandene Komponenten; Figma Screen 15 braucht den neuen Text („Dein Betrieb“ plus Erklärsatz). Figma-Token war nicht verfügbar („nicht verfügbar“), daher keine Werte gelesen oder angepasst.

## Folge-Punkte

- Sentry ist in Production nicht aktiv (`NEXT_PUBLIC_SENTRY_DSN` fehlt in Vercel). Ohne DSN bleiben solche Fehler unsichtbar. Das Setzen der Variable gehört zu Zugangsdaten und liegt bei Sinan.
- Figma Screen 15 an den neuen Text angleichen.

## Warum

Lernende sollen nicht denken, es ginge um einen anderen Beruf. Fehlerseiten statt Abstürze halten den Lernpfad nutzbar, auch wenn einzelne Einheiten unvollständig sind.
