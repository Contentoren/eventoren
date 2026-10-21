import { createFileRoute } from "@tanstack/solid-router"
import { OrganizerContractDocumentsPage } from "../organizer/dashboard/contracts/OrganizerContractDocumentsPage.tsx"

export const Route = createFileRoute("/veranstalter-vertraege")({
  head: () => ({
    meta: [{ title: "Veranstalter-Vertragsmuster | Eventoren" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: OrganizerContractDocumentsPage,
})
