import { createFileRoute } from "@tanstack/solid-router"
import { DemoCatalog } from "../../demo/ui/DemoCatalog.tsx"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"

export const Route = createFileRoute("/demo/events-error")({
  head: () => demoRouteHeadCreate("Event catalog error demo", "Review the catalog error state.", "/demo/events-error"),
  component: () => <DemoCatalog scenario="error" />,
})
