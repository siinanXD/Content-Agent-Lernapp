# SIN-248: PR-Steckbrief als Gate-Kommentar

- Issue: https://linear.app/sinan-kahraman/issue/SIN-248/pr-steckbrief-auf-einen-blick-was-von-sinan-gebraucht-wird-und-was
- Verwandt: SIN-247 (Gate gelb statt rot), SIN-207, SIN-223

## Entscheidung

1. Der sticky Gate-Kommentar (Marker `<!-- pr-gate -->`) ist jetzt der Steckbrief, für jeden PR (vorher nur bei `risk:high`). Aufbau und Logik in `scripts/autonomy/steckbrief.mjs` (reine Funktionen, getestet in `src/lib/autonomy/steckbrief.test.ts`); `pr-gate.yml` lädt das Modul wie `risk.mjs` aus der Basis, nie aus dem PR-Code.
2. Zustände: ✅ nichts nötig, 🟠 Freigabe (`risk:high` ohne Label), 🔴 Entscheidung nötig (Abschnitt `## Entscheidung nötig` im PR-Body oder Label `needs-human`), ⏳ Checks laufen oder Reparatur-Runde x/3 (Label `repair:n`).
3. @-Erwähnung steht nur bei 🟠/🔴 im Text. Bei Wechsel auf ✅/⏳ wird der Kommentar aktualisiert und die Erwähnung entfällt.
4. PR-Body in festen Abschnitten (`## Was ändert sich`, `## Ausprobieren`, `## Nach dem Merge`, `## Kosten`, `## Rückgängig`); Worker-Prompt (`buildPrompt`), Claude-Prompt (`claude.yml`, Vorlage `docs/autonomy/claude.yml`) und PR-Vorlage sagen das.
5. Checks aus dem `ci`-Lauf des Head-Commits (Job `build`, Schritte „Unit tests“ und „Smoke + accessibility“), `pr-title` aus dem Gate-Lauf. `merge-gate` zeigt 🟠 „wartet auf Freigabe“ statt ❌ (SIN-247 gilt für die Anzeige; der Check selbst bleibt rot, bis freigegeben).
6. Vorschau-Link aus dem Deployment-Status des Head-Commits (Vercel).

## Annahmen

- Spur wird aus den geänderten Dateien abgeleitet (Frontend: `src/app`, `src/components`; Content: `docs/content`; Infra: `.github`, `scripts`, Docs; sonst Backend), weil PRs kein Spur-Label tragen.
- Fehlen Abschnitte im PR-Body, nutzt der Steckbrief Standardtexte („Revert-PR genügt“, „Nichts Besonderes“, Migration-Hinweis).
- Das Modul liegt im PR, der es einführt, noch nicht in der Basis. Dafür gibt es einen einfachen Rückfallkommentar mit den Freigabe-Schlüsseln; der echte Steckbrief erscheint ab dem nächsten PR nach dem Merge. Der Test-PR-Nachweis (⏳ → 🟠 → ✅) ist deshalb erst danach live möglich und hier nur per Unit-Test belegt.
- Dieser PR ändert `.github/workflows/` und ist damit `risk:high`: Freigabe durch Sinan nötig.
- Figma nicht berührt (kein Frontend).

## Warum

Ein Kommentar statt vieler, feste Reihenfolge, Mensch-Aktion zuerst: so reichen 15 Sekunden am Handy. Eigenbau ist hier klein und hängt an den eigenen Gate-Regeln; fertige Actions kennen `risk.mjs` und `freigegeben` nicht.
