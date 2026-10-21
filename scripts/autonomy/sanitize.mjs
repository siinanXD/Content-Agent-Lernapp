/**
 * Eingaben vor dem Einbetten in Markdown säubern (SIN-435, CodeQL js/incomplete-sanitization).
 * Reine Funktionen; genutzt von steckbrief, digest und content-render-curriculum.
 */

/** Tabellenzelle: erst `\` verdoppeln, dann `|` maskieren. Umgekehrt bliebe ein End-`\` vor `|` wirksam. */
export const escTableCell = (s) => String(s).replace(/\\/g, "\\\\").replace(/\|/g, "\\|");

/**
 * Entfernt HTML-Kommentare vollständig. Start und Ende werden per Index gesucht, damit weder ein
 * einzelner Ersetzungsdurchlauf noch ein neu zusammengesetzter Mehrzeichen-Öffner übrig bleibt.
 * Ein unvollständiger Öffner wird nur selbst entfernt; der folgende Text bleibt erhalten.
 */
export function stripComments(text) {
  let s = String(text);
  for (;;) {
    const start = s.indexOf("<!--");
    if (start === -1) return s;

    const end = s.indexOf("-->", start + 4);
    s =
      end === -1
        ? s.slice(0, start) + s.slice(start + 4)
        : s.slice(0, start) + s.slice(end + 3);
  }
}
