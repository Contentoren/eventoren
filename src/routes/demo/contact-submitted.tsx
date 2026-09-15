import { createFileRoute } from "@tanstack/solid-router"
import { DemoContact } from "../../demo/ui/DemoContact.tsx"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"

export const Route = createFileRoute("/demo/contact-submitted")({
  head: () =>
    demoRouteHeadCreate("Submitted contact demo", "Review the submitted contact state.", "/demo/contact-submitted"),
  component: () => <DemoContact submitted />,
})
