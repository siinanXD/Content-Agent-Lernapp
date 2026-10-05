/**
 * Onboarding (Screens 00, 00b, 15): Einwilligung und Schwerpunkt.
 * Alles lokal im Browser; die Einwilligung steuert nur, ob Nutzungsdaten
 * (PostHog) gesendet werden. Lernen geht auch ohne.
 */

export type Schwerpunkt = {
  id: string;
  title: string;
  /**
   * Curriculum-Maps in docs/content; bei mehreren folgt die Betriebsart-Auswahl.
   * `betrieb` steht für Lernende da; `referenzberuf` nennt nur den Referenz-
   * Rahmenlehrplan (kein anderer Beruf, SIN-249).
   */
  maps: Array<{ mapId: string; betrieb: string; referenzberuf: string }>;
  /** Default, wenn die zweite Auswahl übersprungen wird. */
  defaultMapId: string;
};

/** Die 5 amtlichen MAF-Schwerpunkte (siehe docs/DECISIONS.md D-48). */
export const SCHWERPUNKTE: Schwerpunkt[] = [
  {
    id: "metall-kunststoff",
    title: "Metall- und Kunststofftechnik",
    maps: [
      { mapId: "maf-metall", betrieb: "Metallbetrieb", referenzberuf: "Industriemechaniker" },
      {
        mapId: "maf-kunststoff",
        betrieb: "Kunststoffbetrieb",
        referenzberuf: "Kunststoff- und Kautschuktechnologe",
      },
    ],
    defaultMapId: "maf-metall",
  },
  {
    id: "druck-papier",
    title: "Druckweiter- und Papierverarbeitung",
    maps: [
      {
        mapId: "maf-druckverarbeitung",
        betrieb: "Druckweiterverarbeitung",
        referenzberuf: "Medientechnologe Druckverarbeitung",
      },
      {
        mapId: "maf-packmittel",
        betrieb: "Papier- und Packmittelverarbeitung",
        referenzberuf: "Packmitteltechnologe",
      },
    ],
    defaultMapId: "maf-druckverarbeitung",
  },
  {
    id: "textiltechnik",
    title: "Textiltechnik",
    maps: [
      {
        mapId: "maf-textil",
        betrieb: "Textiltechnik",
        referenzberuf: "Produktionsmechaniker-Textil",
      },
    ],
    defaultMapId: "maf-textil",
  },
  {
    id: "textilveredelung",
    title: "Textilveredelung",
    maps: [
      {
        mapId: "maf-textilveredelung",
        betrieb: "Textilveredelung",
        referenzberuf: "Produktveredler-Textil",
      },
    ],
    defaultMapId: "maf-textilveredelung",
  },
  {
    id: "lebensmitteltechnik",
    title: "Lebensmitteltechnik",
    maps: [
      {
        mapId: "maf-lebensmittel",
        betrieb: "Lebensmitteltechnik",
        referenzberuf: "Fachkraft für Lebensmitteltechnik",
      },
    ],
    defaultMapId: "maf-lebensmittel",
  },
];

export type OnboardingState = {
  /** null = noch nicht gefragt */
  consent: boolean | null;
  schwerpunktId: string | null;
  mapId: string | null;
};

const KEY = "cal-onboarding";
export const EMPTY_ONBOARDING: OnboardingState = {
  consent: null,
  schwerpunktId: null,
  mapId: null,
};

export function loadOnboarding(): OnboardingState {
  if (typeof window === "undefined") return EMPTY_ONBOARDING;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...EMPTY_ONBOARDING, ...JSON.parse(raw) } : EMPTY_ONBOARDING;
  } catch {
    return EMPTY_ONBOARDING;
  }
}

export function saveOnboarding(patch: Partial<OnboardingState>): OnboardingState {
  const next = { ...loadOnboarding(), ...patch };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("cal-consent-change"));
  return next;
}

export function findSchwerpunkt(id: string | null): Schwerpunkt | undefined {
  return SCHWERPUNKTE.find((s) => s.id === id);
}

/** Erster Start: Einwilligung noch nicht beantwortet. */
export function needsOnboarding(state: OnboardingState): boolean {
  return state.consent === null;
}

/* ---- Einstellungen (Screen 16): Erinnerung, Datenexport und -löschung ---- */

export type Reminder = { enabled: boolean; time: string };
const REMINDER_KEY = "cal-reminder";
export const DEFAULT_REMINDER: Reminder = { enabled: false, time: "18:00" };

export function loadReminder(): Reminder {
  if (typeof window === "undefined") return DEFAULT_REMINDER;
  try {
    const raw = window.localStorage.getItem(REMINDER_KEY);
    return raw ? { ...DEFAULT_REMINDER, ...JSON.parse(raw) } : DEFAULT_REMINDER;
  } catch {
    return DEFAULT_REMINDER;
  }
}

export function saveReminder(r: Reminder) {
  window.localStorage.setItem(REMINDER_KEY, JSON.stringify(r));
}

/** Alle lokal gespeicherten Daten der App (`cal-*`) als Objekt. */
export function exportLocalData(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const store of [window.localStorage, window.sessionStorage]) {
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (!k?.startsWith("cal-")) continue;
      const raw = store.getItem(k);
      try {
        out[k] = raw ? JSON.parse(raw) : raw;
      } catch {
        out[k] = raw;
      }
    }
  }
  return out;
}

/** Löscht nur lokale `cal-*`-Daten dieses Geräts, nie Serverdaten. */
export function clearLocalData() {
  for (const store of [window.localStorage, window.sessionStorage]) {
    const keys: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k?.startsWith("cal-")) keys.push(k);
    }
    keys.forEach((k) => store.removeItem(k));
  }
  window.dispatchEvent(new CustomEvent("cal-consent-change"));
}
