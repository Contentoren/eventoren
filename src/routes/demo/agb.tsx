import { createFileRoute } from "@tanstack/solid-router"
import type { ParentComponent } from "solid-js"
import { LegalMarkdownPage } from "../../components/LegalMarkdownPage.tsx"
import { demoStaticPages } from "../../demo/fixtures/demoStaticPages.ts"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoSiteFrame } from "../../demo/ui/DemoSiteFrame.tsx"

const DemoAgbFrame: ParentComponent = (props) => <DemoSiteFrame currentId="agb">{props.children}</DemoSiteFrame>

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
