import { renderToString } from "solid-js/web"
import { OrganizerContractDocumentsPage } from "../src/organizer/dashboard/contracts/OrganizerContractDocumentsPage.tsx"
import { OrganizerContractLinks } from "../src/organizer/dashboard/contracts/OrganizerContractLinks.tsx"

export function organizerContractDocumentsRender() {
  return {
    page: renderToString(() => OrganizerContractDocumentsPage()),
    links: renderToString(() => OrganizerContractLinks()),
  }
}
