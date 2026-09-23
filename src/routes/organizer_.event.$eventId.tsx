import { createFileRoute, redirect, useNavigate } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import { eventorenOrganizerAccessRead } from "../auth/server/eventorenOrganizerAccessRead.ts"
import { OrganizerEventDetailPage } from "../organizer/OrganizerEventDetailPage.tsx"
import { OrganizerShell } from "../organizer/OrganizerShell.tsx"
import { organizerEventDetailPageStateCreate } from "../organizer/organizerEventDetailPageStateCreate.ts"
import { organizerEventDetailSearchParse } from "../organizer/organizerEventDetailSearchParse.ts"
import { seoHeadCreate } from "../seo/seoHeadCreate.ts"

const getOrganizerAccess = createServerFn({ method: "GET" }).handler(eventorenOrganizerAccessRead)

export const Route = createFileRoute("/organizer_/event/$eventId")({
  validateSearch: organizerEventDetailSearchParse,
  head: () => ({
    ...seoHeadCreate("/organizer"),
    meta: [...seoHeadCreate("/organizer").meta, { name: "robots", content: "noindex, nofollow" }],
  }),
  loader: async ({ params }) => {
    const result = await getOrganizerAccess()
    if (result.success) return { eventId: params.eventId }
    if (result.errorMessage === "Eventoren-Veranstalterrolle erforderlich") throw redirect({ to: "/" })
    throw redirect({ to: "/sign-in", search: { returnTo: `/organizer/event/${params.eventId}` } })
  },
  component: () => {
    const navigate = useNavigate()
    const params = Route.useParams()
    const routeSearch = Route.useSearch()
    const state = organizerEventDetailPageStateCreate({
      eventKey: () => params().eventId,
      initialSearch: () => routeSearch().q ?? "",
      initialTicketId: () => routeSearch().ticket ?? "",
      searchReplace: (q, ticket) =>
        void navigate({
          to: "/organizer/event/$eventId",
          params: { eventId: params().eventId },
          search: { ...(q ? { q } : {}), ...(ticket ? { ticket } : {}) },
          replace: true,
        }),
    })
    return <OrganizerEventDetailPage state={state} frame={OrganizerShell} />
  },
})
