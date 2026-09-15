import { createFileRoute } from "@tanstack/solid-router"
import { demoStaticPages } from "../../demo/fixtures/demoStaticPages.ts"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoShell } from "../../demo/ui/DemoShell.tsx"
import { LegalPage } from "../../marketing/LegalPage.tsx"

export const Route = createFileRoute("/demo/terms")({
  head: () => demoRouteHeadCreate("Terms demo", "Review the local Eventoren English terms fixture.", "/demo/terms"),
  component: () => (
    <DemoShell currentId="terms">
      <LegalPage html={() => demoStaticPages.legal.terms} homeHref="/demo" />
    </DemoShell>
  ),
})
