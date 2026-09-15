import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoRedirectHandoff } from "../../demo/ui/DemoRedirectHandoff.tsx"

export const Route = createFileRoute("/demo/abiball-2027")({
  head: () =>
    demoRouteHeadCreate("Abiball 2027 redirect demo", "Review the static-page redirect handoff.", "/demo/abiball-2027"),
  component: DemoRedirectHandoff,
})
