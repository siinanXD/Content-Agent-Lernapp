import type { Metadata } from "next";
import type { LegalDocument } from "./legal-content";

/** Solange Platzhalter im Text stehen: nicht indexieren (SIN-301). */
export function legalMetadata(doc: LegalDocument): Metadata {
  return {
    title: `${doc.title} · Content-Agent-Lernapp`,
    ...(doc.draft ? { robots: { index: false, follow: false } } : {}),
  };
}
