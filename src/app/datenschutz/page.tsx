import { LegalDocument } from "@/components/learner/legal-document";
import { loadLegalDocument } from "@/lib/legal/legal-content";
import { legalMetadata } from "@/lib/legal/legal-metadata";

const doc = loadLegalDocument("datenschutz");
export const metadata = legalMetadata(doc);

/** Screen 28 Datenschutzerklärung */
export default function DatenschutzPage() {
  return <LegalDocument doc={doc} />;
}
