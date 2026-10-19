# SIN-841: Quellen-Chip ohne aria-label, Tab-Hinweis nur für Screenreader

- Issue: https://linear.app/sinan-kahraman/issue/SIN-841
- Entscheidung: Der Link im Quellen-Chip bekommt kein `aria-label` mehr. Der zugängliche Name kommt aus dem sichtbaren Text „Quelle <host>“ (echtes Leerzeichen dazwischen), der Hinweis „(öffnet in neuem Tab)“ steht als `sr-only`-Span im Link.
- Warum: axe-core 4.14 aktiviert `label-content-name-mismatch` (serious): sichtbarer Text muss im zugänglichen Namen stehen. Das alte `aria-label` wich davon ab und blockierte Dependabot #416 (`e2e/warum-panel.spec.ts`). Quelle: https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch
- Annahmen: Der Beleg mit axe 4.14 kommt aus dem CI-Lauf von Dependabot #416 nach `@dependabot rebase`; dieser PR ändert keine Paketversion. Playwright war in der Arbeitsumgebung nicht installierbar (Download gesperrt), der Unit-Test prüft den zugänglichen Namen aus dem HTML.
