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
        Veranstalter-AGB lesen · {organizerContractDocuments.terms.revision}
      </LinkButtonExternal>
      <LinkButtonExternal
        href={`/veranstalter-vertraege#${organizerContractDocuments.dpa.documentId}`}
        newTab
        variant={buttonVariant.link}
        size="sm"
      >
        AVV lesen · {organizerContractDocuments.dpa.revision}
      </LinkButtonExternal>
    </div>
  )
}
