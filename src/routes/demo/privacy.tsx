import { createFileRoute } from "@tanstack/solid-router"
import { demoStaticPages } from "../../demo/fixtures/demoStaticPages.ts"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoScenarioFrame } from "../../demo/ui/DemoScenarioFrame.tsx"
import { LegalPage } from "../../marketing/LegalPage.tsx"

export const Route = createFileRoute("/demo/privacy")({
  head: () =>
    demoRouteHeadCreate("Datenschutz-Demo", "Lokale Eventoren-Demo der Datenschutzerklärung.", "/demo/privacy"),
  component: () => (
    <DemoScenarioFrame currentId="privacy">
      <LegalPage html={() => demoStaticPages.legal.privacy} homeHref="/demo" />
    </DemoScenarioFrame>
  ),
})
