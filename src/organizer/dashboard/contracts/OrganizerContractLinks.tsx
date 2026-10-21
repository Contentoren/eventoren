import { LinkButtonExternal } from "#ui/interactive/link/LinkButton.jsx"
import { organizerContractDocuments } from "./organizerContractDocuments.ts"

export function OrganizerContractLinks() {
  return (
    <div class="flex flex-col gap-2 text-sm">
      <p>
        MUSTER — keine Rechtsberatung, nicht anwaltlich geprüft. Vor produktiver Nutzung rechtlich prüfen und ersetzen.
      </p>
      <LinkButtonExternal href={`/veranstalter-vertraege#${organizerContractDocuments.terms.documentId}`} newTab>
        Veranstalter-AGB lesen (MUSTER) · {organizerContractDocuments.terms.revision}
      </LinkButtonExternal>
      <LinkButtonExternal href={`/veranstalter-vertraege#${organizerContractDocuments.dpa.documentId}`} newTab>
        AVV lesen (MUSTER) · {organizerContractDocuments.dpa.revision}
      </LinkButtonExternal>
    </div>
  )
}
