// Layout-Prüfer (SIN-523): läuft im Browser (page.evaluate) und liefert Funde statt Ausnahmen.
// Absichtlich übereinanderliegende Elemente tragen `data-layout-ok="Begründung"` (gilt auch für Kinder).
export type Fund = {
  regel: "ueberlappung" | "horizontal-scroll" | "abgeschnitten" | "klickziel" | "ausserhalb" | "verdeckt";
  text: string;
  /** Kästen in Seitenkoordinaten für das markierte Bild. */
  boxen: { x: number; y: number; w: number; h: number }[];
};

export const MIN_ZIEL = 44;

// Alles in einer Funktion: page.evaluate serialisiert nur diese eine Funktion in den Browser.
export function pruefeLayout(minZiel: number): Fund[] {
  const funde: Fund[] = [];
  const vw = document.documentElement.clientWidth;
  const sx = window.scrollX;
  const sy = window.scrollY;

  const nameOf = (el: Element) => {
    const id = el.id ? `#${el.id}` : "";
    const cn = (el as HTMLElement).className;
    const cls =
      typeof cn === "string"
        ? cn
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((c) => `.${c}`)
            .join("")
        : "";
    const txt = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
    return `${el.tagName.toLowerCase()}${id}${cls} "${txt}"`;
  };
  const rectOf = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + sx, y: r.top + sy, w: r.width, h: r.height };
  };
  const isVisible = (el: Element) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    // Kleiner als 2 px (sr-only) oder ganz links vor der Seite (Honigtopf-Felder) sieht und erreicht niemand.
    return r.width >= 2 && r.height >= 2 && r.right > 0;
  };
  const exempt = (el: Element) => !!el.closest("[data-layout-ok]");
  const fixedAncestor = (el: Element): Element | null => {
    for (let n: Element | null = el; n && n !== document.documentElement; n = n.parentElement) {
      const p = getComputedStyle(n).position;
      if (p === "fixed" || p === "sticky") return n;
    }
    return null;
  };
  // In einem eigenen Scroll-Container ist Überstand gewollt.
  const inScroller = (el: Element) => {
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const o = getComputedStyle(n).overflowX;
      if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return true;
    }
    return false;
  };

  const interactive = [
    ...document.querySelectorAll(
      "a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=tab]",
    ),
  ].filter((el) => isVisible(el) && !exempt(el));
  // Textblöcke: Elemente mit eigenem Text (keine reinen Container).
  const skip = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "svg", "path"]);
  const texts = [...document.querySelectorAll("body *")].filter((el) => {
    if (skip.has(el.tagName)) return false;
    const own = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim());
    return own && isVisible(el) && !exempt(el);
  });
  const kandidaten = [...new Set([...interactive, ...texts])].filter((el) => !fixedAncestor(el));

  // 1. Überlappung (Toleranz 4 px: Zeilenhöhen von Text ragen leicht in die Nachbarzeile)
  const seen = new Set<string>();
  for (let i = 0; i < kandidaten.length; i++) {
    for (let j = i + 1; j < kandidaten.length; j++) {
      const a = kandidaten[i]!;
      const b = kandidaten[j]!;
      if (a.contains(b) || b.contains(a)) continue;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (w <= 4 || h <= 4) continue;
      const key = `${nameOf(a)}|${nameOf(b)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      funde.push({
        regel: "ueberlappung",
        text: `${nameOf(a)} überlappt ${nameOf(b)} (${Math.round(w)}×${Math.round(h)} px)`,
        boxen: [rectOf(a), rectOf(b)],
      });
    }
  }

  // 2. Horizontales Scrollen
  const html = document.documentElement;
  if (html.scrollWidth > html.clientWidth) {
    funde.push({
      regel: "horizontal-scroll",
      text: `html scrollt waagerecht (scrollWidth ${html.scrollWidth} > clientWidth ${html.clientWidth})`,
      boxen: [],
    });
  }

  // 3. Abgeschnittener Text
  for (const el of document.querySelectorAll("body *")) {
    if (!isVisible(el) || exempt(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.overflowX !== "hidden" && cs.overflowY !== "hidden") continue;
    if (cs.textOverflow === "ellipsis") continue;
    const cut =
      (cs.overflowX === "hidden" && el.scrollWidth > el.clientWidth + 1) ||
      (cs.overflowY === "hidden" && el.scrollHeight > el.clientHeight + 1);
    if (cut && (el.textContent ?? "").trim()) {
      funde.push({
        regel: "abgeschnitten",
        text: `${nameOf(el)} schneidet Inhalt ab (Inhalt ${el.scrollWidth}×${el.scrollHeight} > Kasten ${el.clientWidth}×${el.clientHeight})`,
        boxen: [rectOf(el)],
      });
    }
  }

  // 4. Klickziele (Links im Fließtext, display: inline, sind ausgenommen)
  for (const el of interactive) {
    if (getComputedStyle(el).display === "inline") continue;
    const r = el.getBoundingClientRect();
    if (r.width < minZiel - 0.5 || r.height < minZiel - 0.5) {
      funde.push({
        regel: "klickziel",
        text: `${nameOf(el)} ist nur ${Math.round(r.width)}×${Math.round(r.height)} px (mind. ${minZiel})`,
        boxen: [rectOf(el)],
      });
    }
  }

  // 5. Außerhalb des Viewports (links/rechts)
  for (const el of kandidaten) {
    if (inScroller(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) {
      funde.push({
        regel: "ausserhalb",
        text: `${nameOf(el)} liegt außerhalb des Viewports (links ${Math.round(r.left)}, rechts ${Math.round(r.right)}, Breite ${vw})`,
        boxen: [rectOf(el)],
      });
    }
  }

  // 6. Hinter fixen Leisten: Element in die Mitte holen, dann prüfen, wer an seiner Mitte oben liegt.
  const boxenVorher = new Map<Element, ReturnType<typeof rectOf>>(interactive.map((el) => [el, rectOf(el)]));
  for (const el of interactive) {
    if (fixedAncestor(el)) continue;
    el.scrollIntoView({ block: "center", inline: "nearest" });
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (top && top !== el && !el.contains(top) && !top.contains(el)) {
      const leiste = fixedAncestor(top);
      if (leiste && !exempt(top)) {
        funde.push({ regel: "verdeckt", text: `${nameOf(el)} liegt hinter ${nameOf(leiste)}`, boxen: [boxenVorher.get(el)!] });
      }
    }
  }
  window.scrollTo(sx, sy);

  return funde;
}

/** Meldung: Seite, Viewport und je Fund beide Elemente (Selektor + Text). */
export function formatFunde(route: string, viewport: string, funde: Fund[]): string {
  return [`Layout-Fehler auf ${route} (${viewport}):`, ...funde.map((f) => `  - [${f.regel}] ${f.text}`)].join("\n");
}
