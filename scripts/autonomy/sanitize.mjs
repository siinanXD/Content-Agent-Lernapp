/**
 * Eingaben vor dem Einbetten in Markdown säubern (SIN-435, CodeQL js/incomplete-sanitization).
 * Reine Funktionen; genutzt von steckbrief, digest und content-render-curriculum.
 */

/** Tabellenzelle: erst `\` verdoppeln, dann `|` maskieren. Umgekehrt bliebe ein End-`\` vor `|` wirksam. */
export const escTableCell = (s) => String(s).replace(/\\/g, "\\\\").replace(/\|/g, "\\|");

/**
 * Entfernt HTML-Kommentare so, dass kein `<!--` übrig bleibt. Ein einzelner Durchlauf reicht nicht:
 * aus `<!<!-- x -->-- >` entstünde nach dem Entfernen wieder `<!-- >`. Wiederholt bis zur Stabilität.
 */
export function stripComments(text) {
  let s = String(text);
  let prev;
  do {
    prev = s;
    s = s.replace(/<!--[\s\S]*?-->/g, "").replace(/<!--/g, "");
  } while (s !== prev);
  return s;
}
