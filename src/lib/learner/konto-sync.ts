/**
 * Lernstand gehört zum Konto (SIN-1451). Angemeldete Konten speichern Lernereignisse und Stapel in
 * `public.learner_state` (RLS: nur die eigene Zeile). Der Browser bleibt Zwischenspeicher fürs Offline-Lernen:
 * Abgleich = Vereinigung beider Seiten, nie Ersetzen, darum geht nichts verloren, was offline begonnen wurde.
 * Beispielmodus und anonyme Messung (`progress-outbox.ts`) bleiben unberührt.
 */
import { getBrowserSupabase } from "@/lib/auth/browser-client";
import type { ReviewItem } from "@/lib/content/didaktik";
import { isDemoMode } from "@/lib/learner/demo-modus";
import { loadStack, writeStoredStack, type StapelVermerk } from "@/lib/learner/leitner";
import {
  readStoredEvents,
  writeStoredEvents,
  type LearningEvent,
} from "@/lib/learner/streak";

const OWNER_KEY = "cal-lernstand-konto";
const MAX_EVENTS = 800;
const MAX_VERMERKE = 500;

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

export type Stapel = { items: ReviewItem[]; removed: StapelVermerk[] };
/** Zeile in `learner_state.stack`: eine Frage im Stapel oder ihr Löschvermerk. */
type StapelZeile = ReviewItem | (StapelVermerk & { entfernt: true });

const stempel = (i: ReviewItem) => i.at ?? ""; // Stände ohne Zeitpunkt gelten als die ältesten

/**
 * Stapel je Frage: der jüngere Eintrag gewinnt, egal ob Stufe oder Löschvermerk. So bleibt eine fertig gelernte
 * Frage weg und eine falsch beantwortete fällt auf Stufe 1 zurück, ohne dass der Abgleich sie überschreibt.
 * shortcut: nur die jüngsten 500 Löschvermerke bleiben; eine noch ältere Entfernung kann ein Gerät zurückbringen.
 */
export function mergeStack(a: Stapel, b: Stapel): Stapel {
  const items = new Map<string, ReviewItem>();
  for (const i of [...a.items, ...b.items]) {
    const alt = items.get(i.questionId);
    if (!alt || stempel(i) > stempel(alt) || (stempel(i) === stempel(alt) && i.dueAt > alt.dueAt)) {
      items.set(i.questionId, i);
    }
  }
  const removed = new Map<string, StapelVermerk>();
  for (const r of [...a.removed, ...b.removed]) {
    const alt = removed.get(r.questionId);
    if (!alt || r.at > alt.at) removed.set(r.questionId, r);
  }
  for (const [id, r] of removed) {
    const i = items.get(id);
    if (!i) continue;
    if (r.at > stempel(i)) items.delete(id);
    else removed.delete(id);
  }
  const byId = (x: { questionId: string }, y: { questionId: string }) => x.questionId.localeCompare(y.questionId);
  return {
    items: [...items.values()].sort(byId),
    removed: [...removed.values()].sort((x, y) => x.at.localeCompare(y.at)).slice(-MAX_VERMERKE),
  };
}

export const stapelZuZeilen = (s: Stapel): StapelZeile[] => [
  ...s.items,
  ...s.removed.map((r) => ({ ...r, entfernt: true as const })),
];

export function zeilenZuStapel(zeilen: readonly StapelZeile[] | null | undefined): Stapel {
  const stapel: Stapel = { items: [], removed: [] };
  for (const z of zeilen ?? []) {
    if ("entfernt" in z) stapel.removed.push({ questionId: z.questionId, at: z.at });
    else stapel.items.push(z);
  }
  return stapel;
}

type Zeile = { events: LearningEvent[]; stack: StapelZeile[] };
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
    const lokal: Stapel = { items: localStack.items, removed: localStack.removed ?? [] };
    const stapel = mergeStack(lokal, zeilenZuStapel(data?.stack));
    const zeilen = stapelZuZeilen(stapel);

    const lokalZeilen = stapelZuZeilen(mergeStack(lokal, { items: [], removed: [] })); // gleiche Reihenfolge
    const lokalGeaendert = !sameJson(events, localEvents) || !sameJson(zeilen, lokalZeilen);
    if (lokalGeaendert) {
      writeStoredEvents(events);
      writeStoredStack({ ...stapel, updatedAt: localStack.updatedAt });
    }
    if (!data || !sameJson(events, data.events) || !sameJson(zeilen, data.stack)) {
      await client
        .from("learner_state")
        .upsert({ user_id: userId, events, stack: zeilen, updated_at: new Date().toISOString() });
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
