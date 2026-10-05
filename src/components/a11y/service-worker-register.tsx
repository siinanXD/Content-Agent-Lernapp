"use client";

import { useEffect } from "react";

// Build-Kennung aus next.config.ts; koppelt Cache-Name und SW-URL an den Deploy (SIN-250).
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloaded = false;
    // Neuer Worker übernimmt (skipWaiting + clients.claim): einmal neu laden,
    // damit nicht alte Seite und neue Antworten gemischt werden.
    const onChange = () => {
      if (!hadController || reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onChange);
    navigator.serviceWorker
      .register(`/sw.js?v=${encodeURIComponent(BUILD_ID)}`, { updateViaCache: "none" })
      .then((reg) => reg.update())
      .catch(() => {
        /* offline shell optional in dev */
      });
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onChange);
  }, []);
  return null;
}
