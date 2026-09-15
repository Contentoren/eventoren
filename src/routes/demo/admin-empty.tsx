import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoAdmin } from "../../demo/ui/DemoAdmin.tsx"

export const Route = createFileRoute("/demo/admin-empty")({
  head: () =>
    demoRouteHeadCreate("Empty member admin demo", "Review the empty member management state.", "/demo/admin-empty"),
  component: () => <DemoAdmin memberScenario="empty" />,
})
