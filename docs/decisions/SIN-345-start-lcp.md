# SIN-345: /start unter dem LCP-Budget

- Issue: https://linear.app/sinan-kahraman/issue/SIN-345
- Entscheidung: `/start` leitet beim Erststart per Inline-Skript im HTML nach `/willkommen` weiter, bevor CSS und JS laden. Die Schlagzeile von `/start` ist eine Server-Komponente, nur das Formular (`start-form.tsx`) ist Client. Der Client-Redirect bleibt als Rückfall. Grenzen und Toleranz in `performance-budget.json` bleiben unverändert.
- Annahmen: Der Messlauf hat keine Einwilligung gespeichert, `/start` springt also nach `/willkommen`. Das LCP-Element ist darum die Schlagzeile von `/willkommen` (`h1.text-[40px]` im Bento), nicht die von `/start`. Der Umweg über Laden, Hydration und `router.replace` kostete in der simulierten Drosselung rund 300 ms. Die Schrift ist nicht die Ursache (Geist ist schon `display: swap`, vorgeladen, mit Fallback-Anpassung).
- Messung lokal (`npm run perf:budget -- --serve`, je Lauf Median aus 7): `/start` 2270, 2121, 2269 ms (vorher 2564 bis 2578 ms auf `main`; in CI 2756 ms).
- Warum: Weniger Umweg ist wirksamer und billiger als Schrift- oder CSS-Umbauten und braucht keine neue Abhängigkeit.
