import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoOrganizerEventList } from "../../demo/ui/DemoOrganizerEventList.tsx"

export const Route = createFileRoute("/demo/admin_/organizer-empty")({
  head: () =>
    demoRouteHeadCreate(
      "Empty organizer event demo",
      "Review the empty organizer event list state.",
      "/demo/admin/organizer-empty",
    ),
  component: () => <DemoOrganizerEventList empty />,
})
