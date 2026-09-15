import { createFileRoute } from "@tanstack/solid-router"
import { demoStaticPages } from "../../demo/fixtures/demoStaticPages.ts"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoShell } from "../../demo/ui/DemoShell.tsx"
import { LegalPage } from "../../marketing/LegalPage.tsx"

export const Route = createFileRoute("/demo/datenschutz")({
  head: () =>
    demoRouteHeadCreate("Datenschutz demo", "Review the local Eventoren privacy fixture.", "/demo/datenschutz"),
  component: () => (
    <DemoShell currentId="datenschutz">
      <LegalPage html={() => demoStaticPages.legal.datenschutz} homeHref="/demo" />
    </DemoShell>
  ),
})
