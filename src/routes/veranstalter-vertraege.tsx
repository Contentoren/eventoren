import { createFileRoute } from "@tanstack/solid-router"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { OrganizerContractDocumentsPage } from "../organizer/dashboard/contracts/OrganizerContractDocumentsPage.tsx"

export const Route = createFileRoute("/veranstalter-vertraege")({
  head: () => ({
    meta: [{ title: "Veranstalter-Verträge | Eventoren" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: () => (
    <SiteFrame>
      <OrganizerContractDocumentsPage />
    </SiteFrame>
  ),
})
