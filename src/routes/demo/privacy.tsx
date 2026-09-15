import { createFileRoute } from "@tanstack/solid-router"
import { demoStaticPages } from "../../demo/fixtures/demoStaticPages.ts"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoShell } from "../../demo/ui/DemoShell.tsx"
import { LegalPage } from "../../marketing/LegalPage.tsx"

export const Route = createFileRoute("/demo/privacy")({
  head: () =>
    demoRouteHeadCreate("Privacy demo", "Review the local Eventoren English privacy fixture.", "/demo/privacy"),
  component: () => (
    <DemoShell currentId="privacy">
      <LegalPage html={() => demoStaticPages.legal.privacy} homeHref="/demo" />
    </DemoShell>
  ),
})
