# SIN-539: Live-Prüfung rot, Meldekette ab 2× rot

- Links: `.github/workflows/nach-deploy.yml`, `scripts/autonomy/live-check.mjs` (`analyzeLiveCheck`, `liveCheckIssue`), `scripts/autonomy/status.mjs`, `src/lib/live-check.test.ts`
- Entscheidung: Ab dem zweiten roten `nach-deploy`-Lauf in Folge legt der Status-Wächter ein Linear-Issue „Bug: Live-Prüfung (nach-deploy) rot“ an (Priorität 1, Labels `claude`, `Bug`, `dringend`). Ein offenes Issue mit diesem Titelanfang verhindert Dubletten. Zuvor gab es nur einen Kommentar im Status-Issue.
- Annahmen: Dieser Lauf hatte weder `gh` noch Netzzugriff auf die Live-App. Die roten Kennungen (API-xx / UI-xx) des Laufs vom 12.10. wurden deshalb nicht gelesen; die Ursache in der App ist NICHT behoben. Das neue Issue (bzw. ein Folgelauf mit `gh run view --log-failed`) muss das tun.
- Warum: 26 Stunden Rot blieben unbemerkt, weil ein Kommentar keinen Worker startet; `dringend` überspringt die Warteschlange.
