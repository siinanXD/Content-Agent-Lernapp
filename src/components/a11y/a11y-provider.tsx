"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_A11Y,
  loadA11yPrefs,
  saveA11yPrefs,
  type A11yPreferences,
} from "@/lib/a11y/preferences";

const Ctx = createContext<{
  prefs: A11yPreferences;
  setPrefs: (next: A11yPreferences) => void;
}>({
  prefs: DEFAULT_A11Y,
  setPrefs: () => {},
});

export function A11yProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<A11yPreferences>(DEFAULT_A11Y);

  useEffect(() => {
    setPrefsState(loadA11yPrefs());
  }, []);

  function setPrefs(next: A11yPreferences) {
    setPrefsState(next);
    saveA11yPrefs(next);
  }

  return (
    <Ctx.Provider value={{ prefs, setPrefs }}>
      <div
        data-simple-language={prefs.simpleLanguage ? "true" : "false"}
        className={prefs.simpleLanguage ? "text-[17px] leading-7" : undefined}
      >
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function useA11y() {
  return useContext(Ctx);
}
