import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoCatalog } from "../../demo/ui/DemoCatalog.tsx"

export const Route = createFileRoute("/demo/customer_/events-booking-success")({
  head: () =>
    demoRouteHeadCreate(
      "Booking success demo",
      "Review the catalog booking success state.",
      "/demo/customer/events-booking-success",
    ),
  component: () => <DemoCatalog scenario="booking-success" />,
})
