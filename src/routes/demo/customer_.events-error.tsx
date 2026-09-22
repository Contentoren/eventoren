import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoCatalog } from "../../demo/ui/DemoCatalog.tsx"

export const Route = createFileRoute("/demo/customer_/events-error")({
  head: () =>
    demoRouteHeadCreate("Event catalog error demo", "Review the catalog error state.", "/demo/customer/events-error"),
  component: () => <DemoCatalog scenario="error" />,
})
