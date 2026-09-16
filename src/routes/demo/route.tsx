import { createFileRoute } from "@tanstack/solid-router"
import { DemoRouteShell } from "../../demo/ui/DemoRouteShell.tsx"

export const Route = createFileRoute("/demo")({
  component: DemoRouteShell,
})
