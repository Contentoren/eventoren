import { useNavigate } from "@tanstack/solid-router"
import { organizerEventDetailPageStateCreate } from "./organizerEventDetailPageStateCreate.ts"
import { scannerLinkDataSourceLiveCreate } from "./scannerLinkDataSourceLiveCreate.ts"

export function scannerLinkEventDetailRouteStateCreate(inputs: {
  readonly code: () => string
  readonly eventKey: () => string
  readonly search: () => { readonly q?: string; readonly ticket?: string }
}) {
  const navigate = useNavigate()
  return organizerEventDetailPageStateCreate({
    eventKey: inputs.eventKey,
    initialSearch: () => inputs.search().q ?? "",
    initialTicketId: () => inputs.search().ticket ?? "",
    searchReplace: (q, ticket) =>
      void navigate({
        to: "/scanner/$code/event/$eventId",
        params: { code: inputs.code(), eventId: inputs.eventKey() },
        search: { ...(q ? { q } : {}), ...(ticket ? { ticket } : {}) },
        replace: true,
        resetScroll: false,
      }),
    dataSource: scannerLinkDataSourceLiveCreate(inputs.code()),
    linkAccess: true,
  })
}
