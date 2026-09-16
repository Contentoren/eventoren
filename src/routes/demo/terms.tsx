import { createFileRoute } from "@tanstack/solid-router"
import { demoStaticPages } from "../../demo/fixtures/demoStaticPages.ts"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoScenarioFrame } from "../../demo/ui/DemoScenarioFrame.tsx"
import { LegalPage } from "../../marketing/LegalPage.tsx"

export const Route = createFileRoute("/demo/terms")({
  head: () => demoRouteHeadCreate("Terms demo", "Review the local Eventoren English terms fixture.", "/demo/terms"),
  component: () => (
    <DemoScenarioFrame currentId="terms">
      <LegalPage html={() => demoStaticPages.legal.terms} homeHref="/demo" />
    </DemoScenarioFrame>
  ),
})
