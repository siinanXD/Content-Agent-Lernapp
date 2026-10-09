/**
 * SIN-256: Antworten offline sammeln und nach Netzrückkehr an /api/progress senden.
 * Ablage in localStorage (überlebt Neuladen), Kennung ist eine Zufalls-ID ohne Personenbezug.
 */

import { isDemoMode } from "@/lib/learner/demo-modus";

const OUTBOX_KEY = "cal-progress-outbox";
const ID_KEY = "cal-anonymous-id";
const MAX_ITEMS = 500;

export type OutboxEvent = {
  unitId?: string;
  questionId?: string;
  correct?: boolean;
};

type Store = Pick<Storage, "getItem" | "setItem">;

export function loadOutbox(store: Store = window.localStorage): OutboxEvent[] {
  try {
    const parsed: unknown = JSON.parse(store.getItem(OUTBOX_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as OutboxEvent[]) : [];
  } catch {
    return [];
  }
}

function saveOutbox(items: OutboxEvent[], store: Store) {
  try {
    store.setItem(OUTBOX_KEY, JSON.stringify(items.slice(-MAX_ITEMS)));
  } catch {
    /* Speicher voll: Lernen geht vor */
  }
}

export function enqueueProgress(event: OutboxEvent, store: Store = window.localStorage) {
  if (isDemoMode()) return;
  saveOutbox([...loadOutbox(store), event], store);
}

function anonymousId(store: Store): string {
  let id = store.getItem(ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    store.setItem(ID_KEY, id);
  }
  return id;
}

let flushing = false;

/** Sendet die Warteschlange der Reihe nach; bei Fehler bleibt der Rest erhalten. */
export async function flushProgress(
  store: Store = window.localStorage,
  send: typeof fetch = (input, init) => fetch(input, init),
): Promise<void> {
  if (flushing || isDemoMode()) return;
  flushing = true;
  try {
    for (let items = loadOutbox(store); items.length > 0; items = loadOutbox(store)) {
      const res = await send("/api/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ anonymousId: anonymousId(store), ...items[0] }),
      });
      // 4xx: Ereignis ist unbrauchbar, verwerfen; 5xx/Netzfehler: später erneut.
      if (!res.ok && res.status >= 500) return;
      saveOutbox(items.slice(1), store);
    }
  } catch {
    /* offline: bleibt in der Warteschlange */
  } finally {
    flushing = false;
  }
}
