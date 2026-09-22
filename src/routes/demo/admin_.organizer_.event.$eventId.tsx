import { createFileRoute, useNavigate } from "@tanstack/solid-router"
import { DemoOrganizerEventDetail } from "../../demo/ui/DemoOrganizerEventDetail.tsx"
import { seo } from "../../lib/seo.js"
import { organizerEventDetailSearchParse } from "../../organizer/organizerEventDetailSearchParse.ts"

export const Route = createFileRoute("/demo/admin_/organizer_/event/$eventId")({
  validateSearch: organizerEventDetailSearchParse,
  head: () => ({
    meta: [
      ...seo.pageMeta({
        title: "Organizer ticket check-in demo",
        description: "Try local ticket search, check-in and QR scanner scenarios without a backend.",
        path: "/demo/admin/organizer/event/xyz",
      }),
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [seo.canonicalLink("/demo/admin/organizer/event/xyz")],
  }),
  component: DemoOrganizerEventRoute,
})

function DemoOrganizerEventRoute() {
  const navigate = useNavigate()
  const params = Route.useParams()
  const routeSearch = Route.useSearch()
  return (
    <DemoOrganizerEventDetail
      eventKey={() => params().eventId}
      initialSearch={() => routeSearch().q ?? ""}
      initialTicketId={() => routeSearch().ticket ?? ""}
      searchReplace={(q, ticket) =>
        void navigate({
          to: "/demo/admin/organizer/event/$eventId",
          params: { eventId: params().eventId },
          search: { ...(q ? { q } : {}), ...(ticket ? { ticket } : {}) },
          replace: true,
        })
      }
    />
  )
}
