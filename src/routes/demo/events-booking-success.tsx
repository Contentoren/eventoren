import { createFileRoute } from "@tanstack/solid-router"
import { DemoCatalog } from "../../demo/ui/DemoCatalog.tsx"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"

export const Route = createFileRoute("/demo/events-booking-success")({
  head: () =>
    demoRouteHeadCreate(
      "Booking success demo",
      "Review the catalog booking success state.",
      "/demo/events-booking-success",
    ),
  component: () => <DemoCatalog scenario="booking-success" />,
})
