import { createFileRoute } from "@tanstack/solid-router"
import { demoOrganizerListSearchParse } from "../../demo/model/demoOrganizerListSearchParse.ts"
import { DemoOrganizerEventList } from "../../demo/ui/DemoOrganizerEventList.tsx"
import { seo } from "../../lib/seo.js"

export const Route = createFileRoute("/demo/organizer")({
  validateSearch: demoOrganizerListSearchParse,
  head: () => ({
    meta: [
      ...seo.pageMeta({
        title: "Organizer demo",
        description: "Explore backend-free organizer event fixtures.",
        path: "/demo/organizer",
      }),
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [seo.canonicalLink("/demo/organizer")],
  }),
  component: DemoOrganizerRoute,
})

function DemoOrganizerRoute() {
  const search = Route.useSearch()
  return <DemoOrganizerEventList empty={search().scenario === "empty"} />
}
