import { createFileRoute } from "@tanstack/solid-router"
import { demoCatalogEvents } from "../../demo/fixtures/demoCatalogEvents.ts"
import { DemoEventDetail } from "../../demo/ui/DemoEventDetail.tsx"
import { DemoEventDetailMissing } from "../../demo/ui/DemoEventDetailMissing.tsx"
import { seo } from "../../lib/seo.js"

export const Route = createFileRoute("/demo/customer_/events_/$eventId")({
  head: () => ({
    meta: [
      ...seo.pageMeta({
        title: "Event detail demo",
        description: "Choose tickets in a backend-free Eventoren event detail workflow.",
        path: "/demo/customer/events",
      }),
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [seo.canonicalLink("/demo/customer/events")],
  }),
  component: DemoEventDetailRoute,
})

function DemoEventDetailRoute() {
  const params = Route.useParams()
  const foundEvent = () => demoCatalogEvents.find((candidate) => candidate.id === params().eventId)
  const fallbackEvent = demoCatalogEvents[0]
  if (!fallbackEvent) return <DemoEventDetailMissing />
  const isMissing = () => foundEvent() === undefined
  const event = () => foundEvent() ?? fallbackEvent

  return <DemoEventDetail event={event()} isMissing={isMissing()} />
}
