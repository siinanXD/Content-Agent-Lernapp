# SIN-278: Sicherheits-Stichprobe gegen die Live-App

- **Links:** Linear [SIN-278](https://linear.app/sinan-kahraman/issue/SIN-278), Vorläufer `docs/decisions/SIN-272-sicherheits-stichprobe.md`, Produktion `https://content-agent-ashen-nu.vercel.app`
- **Entscheidung:** App-URL steht als nicht geheime Konfiguration in `docs/autonomy/config.json` (`APP_BASE_URL`). `scripts/safety-sample.mjs --live --review-page` liest nur `GET /api/learner/phase-a` und schreibt `docs/content/safety-sample-<datum>.md` (10 % der Fragen zu Elektrik und Maschinensicherheit, je Frage Antwort, Quelle mit Link, Ankreuzfeld).
- **Annahmen:**
  - Der Lauf konnte in der Agenten-Sandbox **nicht** stattfinden (kein Netzzugriff auf die Live-App). Die Prüfseite liegt deshalb noch nicht vor; sie entsteht beim ersten Lauf mit Netz (`node --import tsx scripts/safety-sample.mjs --live --review-page`).
  - „Elektrik und Maschinensicherheit“ = sicherheitsrelevante Einheiten (siehe SIN-272) plus Stichwort Elektrik im Titel.
  - `content-safety` bleibt leer, bis Sinan das Ergebnis im Chat meldet. Verlinkung im Tages-Update folgt mit der Seite.
- **Warum:** Nur lesend, keine Keys nötig, ein Skript statt neuer Abhängigkeit.
