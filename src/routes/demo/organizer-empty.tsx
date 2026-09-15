import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoOrganizerEventList } from "../../demo/ui/DemoOrganizerEventList.tsx"

export const Route = createFileRoute("/demo/organizer-empty")({
  head: () =>
    demoRouteHeadCreate(
      "Empty organizer events demo",
      "Review the empty organizer event list state.",
      "/demo/organizer-empty",
    ),
  component: () => <DemoOrganizerEventList empty />,
})
