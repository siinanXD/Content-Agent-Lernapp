/**
 * Gemeinsamer JSON-Abruf für alle Autonomie-Skripte (SIN-263).
 * Prüft Status und Inhalt, wiederholt bei kurzen Ausfällen (429, 5xx, Netzfehler, Fehlerseite statt JSON) und
 * liefert Fehlermeldungen mit Dienst, Status und den ersten 80 Zeichen der Antwort.
 */

/** Wartezeiten vor Wiederholung 1 bis 3. */
export const RETRY_DELAYS_MS = [1000, 4000, 10000];
const MAX_RETRY_AFTER_MS = 30000;
const sleepReal = (ms) => new Promise((r) => setTimeout(r, ms));

export class ServiceError extends Error {
  /** @param {string} service @param {string} message @param {{ status?: number | null, retryable?: boolean, retryAfter?: string | null }} [info] */
  constructor(service, message, { status = null, retryable = false, retryAfter = null } = {}) {
    super(`${service}: ${message}`);
    this.name = "ServiceError";
    this.service = service;
    this.status = status;
    this.retryable = retryable;
    this.retryAfter = retryAfter;
  }
}

const snippet = (text) => String(text ?? "").replace(/\s+/g, " ").trim().slice(0, 80);

/** `Retry-After` (Sekunden oder Datum) in Millisekunden, gedeckelt; null ohne gültigen Wert. */
export function retryAfterMs(value, now = Date.now()) {
  if (value == null || value === "") return null;
  const secs = Number(value);
  const ms = Number.isFinite(secs) ? secs * 1000 : new Date(value).getTime() - now;
  return Number.isFinite(ms) ? Math.min(Math.max(ms, 0), MAX_RETRY_AFTER_MS) : null;
}

/** Rate-Limit-Header (x-ratelimit-*, retry-after) als eine Zeile, leer wenn es keine gibt. */
export function rateLimitLine(headers) {
  const parts = [];
  headers?.forEach?.((value, key) => {
    if (/^(x-)?ratelimit|^retry-after$/i.test(key)) parts.push(`${key}=${value}`);
  });
  return parts.join(" ");
}

async function once(service, url, init, fetchImpl) {
  let res;
  try {
    res = await fetchImpl(url, init);
  } catch (e) {
    throw new ServiceError(service, `nicht erreichbar (${e.cause?.code ?? e.message})`, { retryable: true });
  }
  const text = typeof res.text === "function" ? await res.text().catch(() => "") : null;
  if (!res.ok) {
    const body = text ?? "";
    throw new ServiceError(service, `HTTP ${res.status}${body ? `: ${snippet(body)}` : ""}`, {
      status: res.status,
      retryable: res.status === 429 || res.status >= 500,
      retryAfter: res.headers?.get?.("retry-after") ?? null,
    });
  }
  if (res.status === 204) return { data: null, res };
  try {
    return { data: text == null ? await res.json() : JSON.parse(text), res };
  } catch {
    // 200 mit Fehlerseite („upstream connect error …“): wie ein kurzer Ausfall behandeln.
    const type = res.headers?.get?.("content-type") ?? "unbekannt";
    throw new ServiceError(service, `keine JSON-Antwort (HTTP ${res.status}, ${type}): ${snippet(text)}`, { status: res.status, retryable: true });
  }
}

/**
 * Wie `fetchJson`, liefert aber auch die Antwort (für Header wie `Link`).
 * @param {string} service Name für Fehlermeldungen („Linear“, „Sentry“ …)
 * @param {string} url
 * @param {RequestInit} [init]
 * @param {{ fetchImpl?: typeof fetch, sleep?: (ms: number) => Promise<void>, delays?: number[], log?: (line: string) => void }} [opts]
 */
export async function fetchJsonFull(service, url, init = {}, { fetchImpl = fetch, sleep = sleepReal, delays = RETRY_DELAYS_MS, log = console.log } = {}) {
  for (let attempt = 0; ; attempt++) {
    let failure;
    try {
      const out = await once(service, url, init, fetchImpl);
      const limits = rateLimitLine(out.res.headers);
      if (limits) log(`${service} Rate-Limit: ${limits}`);
      return out;
    } catch (e) {
      if (!(e instanceof ServiceError)) throw e;
      failure = e;
    }
    if (!failure.retryable || attempt >= delays.length) throw failure;
    const wait = failure.status === 429 ? (retryAfterMs(failure.retryAfter) ?? delays[attempt]) : delays[attempt];
    log(`${failure.message}; neuer Versuch ${attempt + 1} von ${delays.length} in ${Math.round(wait / 1000)} s`);
    await sleep(wait);
  }
}

/** JSON von `url`, mit Statusprüfung und Wiederholungen. Wirft `ServiceError`. */
export async function fetchJson(service, url, init = {}, opts = {}) {
  return (await fetchJsonFull(service, url, init, opts)).data;
}
