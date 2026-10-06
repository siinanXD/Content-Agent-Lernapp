"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_A11Y,
  loadA11yPrefs,
  saveA11yPrefs,
  type A11yPreferences,
} from "@/lib/a11y/preferences";
import { useAfterMount } from "@/lib/use-after-mount";

const Ctx = createContext<{
  prefs: A11yPreferences;
  setPrefs: (next: A11yPreferences) => void;
}>({
  prefs: DEFAULT_A11Y,
  setPrefs: () => {},
});

export function A11yProvider({ children }: { children: ReactNode }) {
  const storedPrefs = useAfterMount(loadA11yPrefs, DEFAULT_A11Y);
  // A change made through setPrefs wins over the value read on mount.
  const [changedPrefs, setChangedPrefs] = useState<A11yPreferences | null>(null);
  const prefs = changedPrefs ?? storedPrefs;

  function setPrefs(next: A11yPreferences) {
    setChangedPrefs(next);
    saveA11yPrefs(next);
  }

  return (
    <Ctx.Provider value={{ prefs, setPrefs }}>
      <div
        data-simple-language={prefs.simpleLanguage ? "true" : "false"}
        // flex-1: gibt dem Inhalt die volle Fensterhöhe (Hauptkacheln füllen den Bildschirm, Variante 2026)
        className={`flex flex-1 flex-col${prefs.simpleLanguage ? " text-[17px] leading-7" : ""}`}
      >
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function useA11y() {
  return useContext(Ctx);
}
