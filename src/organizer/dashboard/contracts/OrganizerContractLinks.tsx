import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { LinkButtonExternal } from "#ui/interactive/link/LinkButton.jsx"
import { organizerContractDocuments } from "./organizerContractDocuments.ts"

export function OrganizerContractLinks() {
  return (
    <div class="flex flex-col gap-2 text-sm">
      <LinkButtonExternal
        href={`/veranstalter-vertraege#${organizerContractDocuments.terms.documentId}`}
        newTab
        variant={buttonVariant.link}
        size="sm"
      >
        Veranstaltervertrag, Preisblatt und Widerrufsbelehrung lesen
      </LinkButtonExternal>
      <LinkButtonExternal
        href={`/veranstalter-vertraege#${organizerContractDocuments.dpa.documentId}`}
        newTab
        variant={buttonVariant.link}
        size="sm"
      >
        Auftragsverarbeitungsvertrag (AVV) einschließlich Anlagen lesen
      </LinkButtonExternal>
      <p class="text-xs text-content-muted break-words">
        Vertragsstand: {organizerContractDocuments.terms.revision}
        <br />
        AVV-Stand: {organizerContractDocuments.dpa.revision}. Beide Links öffnen einen neuen Tab.
      </p>
    </div>
  )
}
