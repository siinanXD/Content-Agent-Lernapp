/**
 * Lernstand gehört zum Konto (SIN-1451). Angemeldete Konten speichern Lernereignisse und Stapel in
 * `public.learner_state` (RLS: nur die eigene Zeile). Der Browser bleibt Zwischenspeicher fürs Offline-Lernen:
 * Abgleich = Vereinigung beider Seiten, nie Ersetzen, darum geht nichts verloren, was offline begonnen wurde.
 * Beispielmodus und anonyme Messung (`progress-outbox.ts`) bleiben unberührt.
 */
import { getBrowserSupabase } from "@/lib/auth/browser-client";
import type { ReviewItem } from "@/lib/content/didaktik";
import { isDemoMode } from "@/lib/learner/demo-modus";
import { loadStack, writeStoredStack } from "@/lib/learner/leitner";
import {
  readStoredEvents,
  writeStoredEvents,
  type LearningEvent,
} from "@/lib/learner/streak";

const OWNER_KEY = "cal-lernstand-konto";
const MAX_EVENTS = 800;

const eventKey = (e: LearningEvent) => `${e.at}|${e.kind}|${e.unitId ?? ""}`;

/** Vereinigung der Ereignisse (gleicher Zeitpunkt, Art und Einheit = dasselbe Ereignis), älteste zuerst. */
export function mergeEvents(
  a: readonly LearningEvent[],
  b: readonly LearningEvent[],
): LearningEvent[] {
  const byKey = new Map<string, LearningEvent>();
  for (const e of [...a, ...b]) byKey.set(eventKey(e), e);
  return [...byKey.values()].sort((x, y) => x.at.localeCompare(y.at)).slice(-MAX_EVENTS);
}

/**
 * Stapel je Frage: der Eintrag mit dem späteren Fälligkeitstermin gewinnt (der jüngere Lernschritt rückt weiter).
 * shortcut: eine Frage, die auf einem Gerät den Stapel verlassen hat, kommt vom anderen Gerät zurück;
 * ausbauen, wenn Wiederholungen einen eigenen Änderungszeitpunkt je Frage bekommen.
 */
export function mergeStack(a: readonly ReviewItem[], b: readonly ReviewItem[]): ReviewItem[] {
  const byId = new Map<string, ReviewItem>();
  for (const i of [...a, ...b]) {
    const old = byId.get(i.questionId);
    if (!old || i.dueAt > old.dueAt) byId.set(i.questionId, i);
  }
  return [...byId.values()];
}

type Zeile = { events: LearningEvent[]; stack: ReviewItem[] };
const sameJson = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);

let laeuft = false;
let nochmal = false;

/**
 * Holt den Stand des Kontos, führt ihn mit dem lokalen zusammen und schreibt Geändertes zurück.
 * Liefert `true`, wenn sich der lokale Stand durch den Abgleich geändert hat (Ansichten neu lesen).
 * Ohne Anmeldung, im Beispielmodus oder offline: `false`, der lokale Stand bleibt unverändert.
 */
export async function syncLernstand(): Promise<boolean> {
  if (typeof window === "undefined" || isDemoMode()) return false;
  if (laeuft) {
    nochmal = true;
    return false;
  }
  laeuft = true;
  try {
    const client = await getBrowserSupabase();
    const userId = (await client?.auth.getSession())?.data.session?.user.id;
    if (!client || !userId) return false;

    // Gemeinsames Gerät: Stand eines anderen Kontos nie in dieses Konto übernehmen.
    const owner = window.localStorage.getItem(OWNER_KEY);
    if (owner && owner !== userId) {
      writeStoredEvents([]);
      writeStoredStack({ items: [], updatedAt: new Date().toISOString() });
    }
    window.localStorage.setItem(OWNER_KEY, userId);

    const { data, error } = await client
      .from("learner_state")
      .select("events, stack")
      .eq("user_id", userId)
      .maybeSingle<Zeile>();
    if (error) return false;

    const localEvents = readStoredEvents();
    const localStack = loadStack();
    const events = mergeEvents(localEvents, data?.events ?? []);
    const items = mergeStack(localStack.items, data?.stack ?? []);

    const lokalGeaendert = !sameJson(events, localEvents) || !sameJson(items, localStack.items);
    if (lokalGeaendert) {
      writeStoredEvents(events);
      writeStoredStack({ items, updatedAt: localStack.updatedAt });
    }
    if (!data || !sameJson(events, data.events) || !sameJson(items, data.stack)) {
      await client
        .from("learner_state")
        .upsert({ user_id: userId, events, stack: items, updated_at: new Date().toISOString() });
    }
    return lokalGeaendert;
  } catch {
    return false; // offline oder Speicher gesperrt: beim nächsten Start/online erneut
  } finally {
    laeuft = false;
    if (nochmal) {
      nochmal = false;
      void syncLernstand();
    }
  }
}
