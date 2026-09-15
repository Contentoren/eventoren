import { createFileRoute } from "@tanstack/solid-router"
import type { ParentComponent } from "solid-js"
import { LegalMarkdownPage } from "../../components/LegalMarkdownPage.tsx"
import { demoStaticPages } from "../../demo/fixtures/demoStaticPages.ts"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoShell } from "../../demo/ui/DemoShell.tsx"

const DemoAgbFrame: ParentComponent = (props) => <DemoShell currentId="agb">{props.children}</DemoShell>

export const Route = createFileRoute("/demo/agb")({
  head: () => demoRouteHeadCreate("AGB demo", "Review the local Eventoren terms fixture.", "/demo/agb"),
  component: () => (
    <LegalMarkdownPage
      title={demoStaticPages.legal.agb.title}
      html={demoStaticPages.legal.agb.html}
      frame={DemoAgbFrame}
    />
  ),
})
