import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoNavigationMenu } from "../../demo/ui/DemoNavigationMenu.tsx"

export const Route = createFileRoute("/demo/navigation")({
  head: () =>
    demoRouteHeadCreate("Navigation menu demo", "Review the production mobile menu state.", "/demo/navigation"),
  component: DemoNavigationMenu,
})
