# SIN-477: Zuordnen-Fragen mit `correct` als Paarliste nicht verwerfen

- Links: https://linear.app/sinan-kahraman/issue/SIN-477, Vorgänger https://linear.app/sinan-kahraman/issue/SIN-384, PR siinanXD/Content-Agent-Lernapp#283
- Entscheidung: In `build()` (`src/lib/learner/normalize-question.ts`) prüft `correct` bei Typ `zuordnen` seine Form nicht mehr. Ist die Form unbekannt, wird `correct` leer gesetzt. Die Frage bleibt, wenn `pairs` gültig ist. Die Prüfung von `pairs` bleibt unverändert.
- Annahmen: `pairs` ist für Zuordnen die einzige Quelle der Wahrheit (`PairQuestion` nutzt `correct` nicht). Daher wird `correct` nicht aus den Paaren abgeleitet, sondern leer gelassen. Andere Typen behalten die strenge Prüfung. Die Daten in Supabase bleiben unverändert.
- Warum: 93 Zuordnen-Fragen in 76 Einheiten fehlten still, weil `correct` als Liste von Paaren kam und der Normalisierer alle Listen von Text als Form verlangte. Eine Änderung nur an dieser Stelle behebt es für alle vorhandenen Daten.
