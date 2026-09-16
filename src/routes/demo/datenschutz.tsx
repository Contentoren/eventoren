import { createFileRoute } from "@tanstack/solid-router"
import { demoStaticPages } from "../../demo/fixtures/demoStaticPages.ts"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoScenarioFrame } from "../../demo/ui/DemoScenarioFrame.tsx"
import { LegalPage } from "../../marketing/LegalPage.tsx"

export const Route = createFileRoute("/demo/datenschutz")({
  head: () =>
    demoRouteHeadCreate("Datenschutz demo", "Review the local Eventoren privacy fixture.", "/demo/datenschutz"),
  component: () => (
    <DemoScenarioFrame currentId="datenschutz">
      <LegalPage html={() => demoStaticPages.legal.datenschutz} homeHref="/demo" />
    </DemoScenarioFrame>
  ),
})
