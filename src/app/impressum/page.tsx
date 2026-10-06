import { LegalDocument } from "@/components/learner/legal-document";
import { loadLegalDocument } from "@/lib/legal/legal-content";
import { legalMetadata } from "@/lib/legal/legal-metadata";

const doc = loadLegalDocument("impressum");
export const metadata = legalMetadata(doc);

/** Screen 27 Impressum */
export default function ImpressumPage() {
  return <LegalDocument doc={doc} />;
}
