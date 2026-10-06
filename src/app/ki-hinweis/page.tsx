import { LegalDocument } from "@/components/learner/legal-document";
import { loadLegalDocument } from "@/lib/legal/legal-content";
import { legalMetadata } from "@/lib/legal/legal-metadata";

const doc = loadLegalDocument("ki-hinweis");
export const metadata = legalMetadata(doc);

/** Screen 29 Hinweis zu KI-Inhalten */
export default function KiHinweisPage() {
  return <LegalDocument doc={doc} />;
}
