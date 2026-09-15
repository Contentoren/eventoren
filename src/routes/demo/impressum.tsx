import { createFileRoute } from "@tanstack/solid-router"
import { demoStaticPages } from "../../demo/fixtures/demoStaticPages.ts"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoShell } from "../../demo/ui/DemoShell.tsx"
import { LegalPage } from "../../marketing/LegalPage.tsx"

export const Route = createFileRoute("/demo/impressum")({
  head: () =>
    demoRouteHeadCreate("Impressum demo", "Review the local Eventoren legal page fixture.", "/demo/impressum"),
  component: () => (
    <DemoShell currentId="impressum">
      <LegalPage html={() => demoStaticPages.legal.impressum} homeHref="/demo" />
    </DemoShell>
  ),
})
