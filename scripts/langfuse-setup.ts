/**
 * SIN-299: Langfuse einrichten (idempotent, mehrfach ausführbar).
 *   npm run langfuse:setup
 * Legt Score-Configs (Quellentreue, Eindeutigkeit, Niveau, Sprache, Stichprobe Sicherheit),
 * die Prüf-Warteschlange und die Prompts (Richter, Erzeuger) an. Braucht LANGFUSE_PUBLIC_KEY/SECRET_KEY.
 * Das Dashboard baut man in der Oberfläche: docs/ops/langfuse-dashboard.md.
 */
import { LangfuseClient } from "@langfuse/client";
import { generatorSystemText } from "../src/lib/generate/didaktik-prompts";
import { JUDGE_PROMPT_VERSION, JUDGE_SYSTEM_PROMPT } from "../src/lib/quality/evaluate-agent";
import { getLangfuseConfig } from "../src/lib/quality/langfuse-client";
import { PROMPT_NAMEN } from "../src/lib/quality/langfuse-names";
import { ensureDashboard, ensureScoreConfigs, ensureStichprobeQueue, syncPrompt } from "../src/lib/quality/langfuse-verwaltung";

async function main() {
  const cfg = getLangfuseConfig();
  if (!cfg) {
    console.error("LANGFUSE_PUBLIC_KEY und LANGFUSE_SECRET_KEY fehlen: nichts eingerichtet.");
    process.exit(2);
  }
  const c = new LangfuseClient(cfg);
  const configs = await ensureScoreConfigs(c);
  console.log(`Score-Configs: ${Object.keys(configs).length}`);
  console.log(`Warteschlange: ${await ensureStichprobeQueue(c)}`);
  const richter = await syncPrompt(c, PROMPT_NAMEN.richter, JUDGE_SYSTEM_PROMPT, JUDGE_PROMPT_VERSION);
  const erzeuger = await syncPrompt(c, PROMPT_NAMEN.erzeuger, generatorSystemText(), "kurslauf");
  console.log(`Prompts: ${PROMPT_NAMEN.richter} v${richter}, ${PROMPT_NAMEN.erzeuger} v${erzeuger}`);
  try {
    console.log(`Dashboard: ${await ensureDashboard(c)}`);
  } catch (err) {
    // Unstable-API: bei Fehlern von Hand nachbauen (docs/ops/langfuse-dashboard.md).
    console.warn(`Dashboard nicht angelegt: ${err instanceof Error ? err.message : err}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
