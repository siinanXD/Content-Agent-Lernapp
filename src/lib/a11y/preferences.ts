export type A11yPreferences = {
  simpleLanguage: boolean;
  readAloud: boolean;
};

const KEY = "cal-a11y-prefs";

export const DEFAULT_A11Y: A11yPreferences = {
  simpleLanguage: false,
  readAloud: false,
};

export function loadA11yPrefs(): A11yPreferences {
  if (typeof window === "undefined") return DEFAULT_A11Y;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_A11Y, ...JSON.parse(raw) } : DEFAULT_A11Y;
  } catch {
    return DEFAULT_A11Y;
  }
}

export function saveA11yPrefs(prefs: A11yPreferences) {
  window.localStorage.setItem(KEY, JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent("cal-a11y-change", { detail: prefs }));
}

export function speakGerman(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "de-DE";
  window.speechSynthesis.speak(u);
}
