/**
 * Robuste Env-Prüfung (SIN-308): Werte aus Infisical/Vercel kommen manchmal mit
 * Anführungszeichen oder Leerzeichen. Fehler werden nur geloggt, nie geworfen.
 */

/** Entfernt Leerzeichen und umschließende Anführungszeichen (einfach, doppelt, Backtick). */
export function cleanEnvValue(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  let value = raw.trim();
  while (value.length >= 2 && /^(["'`])[\s\S]*\1$/.test(value)) {
    value = value.slice(1, -1).trim();
  }
  return value || undefined;
}

/** Gültige http(s)-URL ohne abschließenden Schrägstrich, sonst `null`. */
export function parseHttpUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

/**
 * Liest eine URL-Variable. Ungültig → Warnung im Log und `null`; die Funktion läuft weiter.
 * Die Warnung enthält den Namen, nie den Wert (kann ein Geheimnis enthalten).
 */
export function readEnvUrl(
  name: string,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const cleaned = cleanEnvValue(env[name]);
  if (!cleaned) return null;
  const url = parseHttpUrl(cleaned);
  if (!url) {
    console.warn(`[env] ${name} ist keine gültige http(s)-URL und wird ignoriert.`);
  }
  return url;
}

/** URL-Variablen, die beim Start geprüft werden (Sentry-DSN ist ebenfalls eine URL). */
export const URL_ENV_NAMES = [
  "LANGFUSE_BASE_URL",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "NEXT_PUBLIC_SENTRY_DSN",
  "SENTRY_DSN",
] as const;

/** Prüft alle URL-Variablen und gibt die ungültigen Namen zurück (loggt, wirft nie). */
export function checkEnvUrls(env: NodeJS.ProcessEnv = process.env): string[] {
  const invalid: string[] = [];
  for (const name of URL_ENV_NAMES) {
    if (cleanEnvValue(env[name]) && readEnvUrl(name, env) === null) invalid.push(name);
  }
  return invalid;
}
