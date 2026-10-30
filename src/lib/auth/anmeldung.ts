/** Reine Hilfen für Anmelden, Registrieren und Passwort zurücksetzen (SIN-1197). */

export const MIN_PASSWORT = 8;
const MAX_PASSWORT = 72; // bcrypt schneidet darüber ab

const STANDARD_ZIEL = "/lernpfad";
const AUSBILDER_ZIEL = "/ausbilder/gruppen";

export function pruefeEmail(wert: string): string | null {
  const email = wert.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
    ? null
    : "Bitte geben Sie eine gültige E-Mail-Adresse ein.";
}

export function pruefePasswort(wert: string): string | null {
  if (wert.length < MIN_PASSWORT) return `Das Passwort braucht mindestens ${MIN_PASSWORT} Zeichen.`;
  if (wert.length > MAX_PASSWORT) return `Das Passwort darf höchstens ${MAX_PASSWORT} Zeichen haben.`;
  return null;
}

/** Nur Pfade der eigenen Seite (`/x`), nie `//host` oder `https:`: sonst wäre der Login ein offener Weiterleiter. */
export function sicheresZiel(weiter: string | null | undefined): string | null {
  if (!weiter || !weiter.startsWith("/") || weiter.startsWith("//") || /[\\\u0000-\u001f]/.test(weiter)) return null;
  return weiter;
}

/** Ziel nach dem Login: die gewünschte Seite, sonst je nach Rolle Gruppen (Ausbilder) oder Lernpfad. */
export function zielNachLogin(rolle: unknown, weiter: string | null | undefined): string {
  return sicheresZiel(weiter) ?? (rolle === "ausbilder" ? AUSBILDER_ZIEL : STANDARD_ZIEL);
}

/** Adresse für `emailRedirectTo`/`redirectTo`: immer die eigene Origin, nie die Site-URL des gemeinsamen Projekts. */
export function mailLink(origin: string, pfad: string): string {
  return `${origin}${sicheresZiel(pfad) ?? STANDARD_ZIEL}`;
}

type AuthFehler = { status?: number; code?: string } | null;

/** Anmelden: nie sagen, ob die Adresse ein Konto hat. Nur „E-Mail nicht bestätigt“ (kommt erst nach richtigem Passwort). */
export function anmeldeFehler(fehler: NonNullable<AuthFehler>): string {
  if (fehler.code === "email_not_confirmed") return "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse. Die Mail liegt in Ihrem Postfach.";
  if (fehler.status === 400 || fehler.status === 401 || fehler.status === 422) return "E-Mail oder Passwort stimmt nicht.";
  if (fehler.status === 429) return "Zu viele Versuche. Bitte warten Sie kurz.";
  return "Das hat nicht geklappt. Bitte versuchen Sie es noch einmal.";
}

/**
 * Mail-Versand (Registrieren, Passwort vergessen): Fehler, die verraten würden, ob ein Konto besteht, zählen als Erfolg.
 * Echte Fehler (Netz, Mail-Limit, Server) melden wir.
 */
export function mailFehlerSichtbar(fehler: AuthFehler): boolean {
  if (!fehler) return false;
  if (fehler.status === 429 || fehler.code === "over_email_send_rate_limit") return true;
  if (fehler.status === 400 || fehler.status === 422) return fehler.code === "weak_password" || fehler.code === "validation_failed";
  return true;
}
