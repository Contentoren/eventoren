import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoAdmin } from "../../demo/ui/DemoAdmin.tsx"

export const Route = createFileRoute("/demo/admin-new")({
  head: () => demoRouteHeadCreate("New event admin demo", "Review the new event editor state.", "/demo/admin-new"),
  component: () => <DemoAdmin newEvent />,
})
