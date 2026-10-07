/** Maschinenlesbare Startseite (SIN-318): Schema.org Organisation und FAQ. Texte spiegeln nur, was die Seite selbst sagt. */

export const FAQ: ReadonlyArray<{ frage: string; antwort: string }> = [
  {
    frage: "Woher kommen die Fragen?",
    antwort:
      "Jede Frage ist aus Ausbildungsordnung und KMK-Rahmenlehrplan abgeleitet und zeigt ihre Quelle. IHK-Prüfungsaufgaben werden nicht kopiert.",
  },
  {
    frage: "Bewertet die App Teilnehmende?",
    antwort:
      "Nein. Die App zeigt Fortschritt und Lernzeit. Bewertung und Zulassung entscheidet ein Mensch.",
  },
  {
    frage: "Was kostet die Lizenz?",
    antwort:
      "Die Lizenz gilt pro Teilnehmenden, der Preis steht auf Anfrage. Der Demo-Zugang für bis zu 10 Teilnehmende läuft zwei Wochen kostenlos.",
  },
  {
    frage: "Funktioniert die App auf alten Handys?",
    antwort:
      "Ja. Geladene Einheiten lassen sich auch offline weiterlernen, Ergebnisse werden später übertragen.",
  },
];

export function organisationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Lernpfad MAF",
    description:
      "Lern-App für die Abschlussprüfung Maschinen- und Anlagenführer, für Bildungsträger. Fragen aus Ausbildungsordnung und Rahmenlehrplan, mit Quelle.",
    areaServed: "DE",
    knowsLanguage: "de",
  };
}

export function faqSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: "de",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.frage,
      acceptedAnswer: { "@type": "Answer", text: f.antwort },
    })),
  };
}
