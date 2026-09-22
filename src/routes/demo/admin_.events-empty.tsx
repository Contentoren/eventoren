import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoAdmin } from "../../demo/ui/DemoAdmin.tsx"

export const Route = createFileRoute("/demo/admin_/events-empty")({
  head: () =>
    demoRouteHeadCreate(
      "Empty member admin demo",
      "Review the empty member management state.",
      "/demo/admin/events-empty",
    ),
  component: () => <DemoAdmin memberScenario="empty" />,
})
