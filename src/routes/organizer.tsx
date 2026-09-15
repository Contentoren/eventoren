import { createFileRoute, redirect } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import { eventorenOrganizerAccessRead } from "../auth/server/eventorenOrganizerAccessRead.ts"
import { OrganizerEventListPage } from "../organizer/OrganizerEventListPage.tsx"
import { organizerEventListPageStateCreate } from "../organizer/organizerEventListPageStateCreate.ts"
import { seoHeadCreate } from "../seo/seoHeadCreate.ts"

const getOrganizerAccess = createServerFn({ method: "GET" }).handler(eventorenOrganizerAccessRead)

export const Route = createFileRoute("/organizer")({
  head: () => ({
    ...seoHeadCreate("/organizer"),
    meta: [...seoHeadCreate("/organizer").meta, { name: "robots", content: "noindex, nofollow" }],
  }),
  loader: async () => {
    const result = await getOrganizerAccess()
    if (result.success) return { isServerAuthorized: true }
    if (result.errorMessage === "Eventoren-Veranstalterrolle erforderlich") throw redirect({ to: "/" })
    throw redirect({ to: "/sign-in", search: { returnTo: "/organizer" } })
  },
  component: () => {
    const state = organizerEventListPageStateCreate()
    return <OrganizerEventListPage state={state} />
  },
})
