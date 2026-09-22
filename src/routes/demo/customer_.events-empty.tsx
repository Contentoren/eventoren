import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoCatalog } from "../../demo/ui/DemoCatalog.tsx"

export const Route = createFileRoute("/demo/customer_/events-empty")({
  head: () =>
    demoRouteHeadCreate("Empty event catalog demo", "Review the empty catalog state.", "/demo/customer/events-empty"),
  component: () => <DemoCatalog scenario="empty" />,
})
