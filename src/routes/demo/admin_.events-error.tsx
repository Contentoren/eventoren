import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoAdmin } from "../../demo/ui/DemoAdmin.tsx"

export const Route = createFileRoute("/demo/admin_/events-error")({
  head: () =>
    demoRouteHeadCreate(
      "Admin member error demo",
      "Review the member management error state.",
      "/demo/admin/events-error",
    ),
  component: () => <DemoAdmin memberScenario="error" />,
})
