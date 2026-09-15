import { createFileRoute } from "@tanstack/solid-router"
import { DemoContact } from "../../demo/ui/DemoContact.tsx"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"

export const Route = createFileRoute("/demo/contact")({
  head: () => demoRouteHeadCreate("Contact demo", "Review the local contact workflow.", "/demo/contact"),
  component: () => <DemoContact />,
})
