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

export type Beruf = {
  id: string;
  title: string;
  /** Kurzangabe unter dem Titel (Dauer und Gliederung laut Ausbildungsordnung). */
  facts: string;
  /** Hinweis auf der Kachel: was als Nächstes kommt. */
  next: string;
  /** Suchbegriffe (klein geschrieben); der Titel zählt immer. */
  suche: string[];
  /** Ziel nach „Weiter“: Schwerpunkte oder (Monoberuf) direkt der Lernpfad. */
  nextRoute: "/schwerpunkt" | "/lernpfad";
  /** Curriculum-Map für Monoberufe ohne Schwerpunkt (docs/content). */
  mapId?: string;
  /** Wert für `session.keyword` (Lernpfad-Untertitel). */
  keyword: string;
};

/** Die Berufe mit amtlicher Quelle (Screen N1). Weitere kommen erst mit Quelle und geprüften Inhalten. */
export const BERUFE: Beruf[] = [
  {
    id: "maf",
    title: "Maschinen- und Anlagenführer/in",
    facts: "2 Jahre · 5 Schwerpunkte",
    next: "Als Nächstes wählst du deinen Schwerpunkt.",
    suche: ["maf", "maschinenführer", "anlagenführer", "maschinen und anlagenführer"],
    nextRoute: "/schwerpunkt",
    keyword: "Maschinen- und Anlagenführer",
  },
  {
    id: "indkfl",
    title: "Industriekaufmann/-frau",
    facts: "3 Jahre · 13 Lernfelder",
    next: "Monoberuf mit Einsatzgebieten, kein Schwerpunkt nötig.",
    suche: ["industriekaufmann", "industriekauffrau", "industriekaufleute", "kaufmann", "kauffrau"],
    nextRoute: "/lernpfad",
    mapId: "indkfl",
    keyword: "Industriekaufmann",
  },
];

/** Filtert nur die vorhandenen Berufe; leere Eingabe zeigt alle. */
export function filterBerufe(query: string): Beruf[] {
  const q = query.trim().toLowerCase();
  if (!q) return BERUFE;
  return BERUFE.filter((b) => [b.title.toLowerCase(), ...b.suche].some((t) => t.includes(q)));
}

export function findBeruf(id: string | null): Beruf | undefined {
  return BERUFE.find((b) => b.id === id);
}

export type OnboardingState = {
  /** null = noch nicht gefragt */
  consent: boolean | null;
  /** Zeitpunkt (ISO) der letzten Entscheidung zu `consent`; für „Erteilt am …“ (Figma 26) */
  consentAt: string | null;
  /** Gewählter Beruf (N1); null bei Altständen vor dem Schritt „Beruf wählen“ */
  berufId: string | null;
  schwerpunktId: string | null;
  mapId: string | null;
};

const KEY = "cal-onboarding";
export const EMPTY_ONBOARDING: OnboardingState = {
  consent: null,
  consentAt: null,
  berufId: null,
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
  if (patch.consent !== undefined && patch.consentAt === undefined) {
    next.consentAt = patch.consent === null ? null : new Date().toISOString();
  }
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
