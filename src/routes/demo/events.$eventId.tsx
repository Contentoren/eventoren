import { createFileRoute } from "@tanstack/solid-router"
import { demoCatalogEvents } from "../../demo/fixtures/demoCatalogEvents.ts"
import { DemoEventDetail } from "../../demo/ui/DemoEventDetail.tsx"
import { DemoEventDetailMissing } from "../../demo/ui/DemoEventDetailMissing.tsx"
import { seo } from "../../lib/seo.js"

export const Route = createFileRoute("/demo/events/$eventId")({
  head: () => ({
    meta: [
      ...seo.pageMeta({
        title: "Event detail demo",
        description: "Choose tickets in a backend-free Eventoren event detail workflow.",
        path: "/demo/events",
      }),
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [seo.canonicalLink("/demo/events")],
  }),
  component: DemoEventDetailRoute,
})

function DemoEventDetailRoute() {
  const params = Route.useParams()
  const event = () => demoCatalogEvents.find((candidate) => candidate.id === params().eventId)
  const currentEvent = event()
  if (!currentEvent) return <DemoEventDetailMissing />
  return <DemoEventDetail event={currentEvent} />
}
