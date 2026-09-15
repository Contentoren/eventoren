import { createFileRoute } from "@tanstack/solid-router"
import { DemoCatalog } from "../../demo/ui/DemoCatalog.tsx"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"

export const Route = createFileRoute("/demo/events-empty")({
  head: () => demoRouteHeadCreate("Empty event catalog demo", "Review the empty catalog state.", "/demo/events-empty"),
  component: () => <DemoCatalog scenario="empty" />,
})
