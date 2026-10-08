# SIN-379 — Hugging Face Pro: Richter-Vorprüfung und Dubletten-Erkennung

- **Links:** Linear [SIN-379](https://linear.app/sinan-kahraman/issue/SIN-379/hugging-face-pro-nutzen-richter-vorprufung-und-dubletten-erkennung); [HF: Pricing and Billing](https://huggingface.co/docs/inference-providers/pricing); [HF: Inference Providers](https://huggingface.co/docs/inference-providers/index); [HF: Security & Compliance](https://huggingface.co/docs/inference-providers/en/security); [HF: Scaleway (EU-Anbieter, Embeddings)](https://huggingface.co/docs/inference-providers/en/providers/scaleway). Gelesen am 2026-10-08.
- **Entscheidung:**
  1. **Kandidat A (offenes Modell als Vorprüfung vor `gpt-5.4-mini`): nein.** Die Ersparnis liegt bei Cent je Kurslauf, das Risiko (Bestehensquote, dritter Datenverarbeiter) ist größer.
  2. **Kandidat B (Dubletten über HF-Embeddings): nein für HF jetzt, ja für die Dubletten-Erkennung selbst.** Eine Prüfung „gibt es diese Frage schon?“ gibt es im Repo bisher nicht (nur ID-Dedupe in `batch-generate.ts`). Sie kommt als eigenes Issue, zuerst ohne Fremdanbieter (lokaler Textvergleich über normalisierte Wort-Shingles, Schwelle am Goldset kalibrieren). HF-Embeddings (`Qwen/Qwen3-Embedding-8B` über Scaleway oder `hf-inference`) bleiben die Option, falls der Textvergleich bei umformulierten Fragen zu viele Dubletten übersieht.
  3. Claude als Erzeuger und `gpt-5.4-mini` als letzte Instanz bleiben unverändert (zwei Modellfamilien).
  4. Kein `HF_TOKEN`, kein neues Secret, kein Code in diesem PR. Das Kostenbuch bekommt erst dann eine eigene HF-Zeile, wenn ein Umsetzungs-Issue HF wirklich nutzt.
- **Fakten aus den HF-Docs:**
  - PRO enthält **2,00 $ Guthaben pro Monat**, das für alle HF-Rechendienste gilt und automatisch vor Pay-as-you-go verbraucht wird. Es gilt nur für Anfragen, die über Hugging Face geroutet werden (nicht mit eigenem Anbieter-Schlüssel). Danach zahlt man die Preise des Anbieters ohne Aufschlag.
  - Chat: u. a. `openai/gpt-oss-120b` bei Scaleway (EU-Anbieter), Cerebras, Groq. Embeddings (Feature Extraction): `hf-inference` (CPU), Scaleway, Together.
  - Daten: HF speichert Anfrage und Antwort nicht und trainiert nicht damit; Logs ohne Nutzerdaten bis 30 Tage. Für die Daten beim Anbieter gelten dessen Richtlinien. Ein EU-Standort ist nur sicher, wenn der Anbieter fest gewählt wird (`:scaleway`), nicht bei `auto`/`:fastest`.
  - Ein AV-Vertrag/DPA von HF ist in den Docs nicht beschrieben (nicht gefunden, kein Beleg).
- **Kostenvergleich (Rechnung, nicht gemessen):**
  - Richter `gpt-5.4-mini`: 0,75 $ / 4,50 $ je 1 Mio. Token (`src/lib/quality/cost-guard.ts`). Rund 2.000 Token je Bewertung ergeben etwa 0,003 $ je Frage; 100 Fragen je Lauf etwa 0,30 $.
  - Der letzte Lauf (`docs/ops/content-runs/2026-10-08T09-08-54-902Z.json`) kostete 2,43 € gesamt, überwiegend Claude (Reparatur allein 1,62 €). Eine Vorprüfung würde nur den Richter-Anteil der aussortierten Fragen sparen: bei 20 % Ausschuss unter 0,10 $ je Lauf.
  - Dem steht gegenüber: ein Anbieter mehr (AV-Vertrag, [SIN-339](https://linear.app/sinan-kahraman/issue/SIN-339/av-vertrage-abschliessen-7-anbieter) wäre um einen achten zu erweitern), ein Fehlerpfad mehr und das Risiko, gute Fragen fälschlich auszusortieren (senkt die Bestehensquote). Die 2 $ Guthaben pro Monat decken ohnehin nur etwa 600 Richter-Bewertungen.
- **Annahmen:**
  1. Es wurde **nicht** am Goldset (70 MAF-Fragen) gemessen: In der Agent-Umgebung gibt es keinen `HF_TOKEN` und keine Live-Keys, und das Secret legt nur Sinan an. Die Aussage zur Bestehensquote ist deshalb eine Rechnung, keine Messung. Wer A erneut prüfen will, braucht zuerst Token und DPA.
  2. 2.000 Token je Bewertung und 20 % Ausschuss sind Schätzungen; sie ändern das Ergebnis nicht, solange der Richter unter 1 € je Lauf bleibt.
  3. Die Preise der HF-Anbieter schwanken; vor einer Umsetzung neu lesen.
- **Warum:** Der Hebel der Kosten liegt bei Claude (Erzeugung und Reparatur), nicht beim Richter. Das PRO-Guthaben (2 $/Monat) ist zu klein, um daran etwas zu ändern, und ein neuer Datenverarbeiter ohne belegten AV-Vertrag widerspricht dem Grundsatz „weniger Abhängigkeiten“. Dubletten-Erkennung ist trotzdem sinnvoll und kommt ohne Fremdanbieter aus.
