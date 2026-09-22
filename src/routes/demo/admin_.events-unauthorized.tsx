import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoAdmin } from "../../demo/ui/DemoAdmin.tsx"

export const Route = createFileRoute("/demo/admin_/events-unauthorized")({
  head: () =>
    demoRouteHeadCreate("Unauthorized admin demo", "Review the admin access state.", "/demo/admin/events-unauthorized"),
  component: () => <DemoAdmin authorized={false} />,
})
