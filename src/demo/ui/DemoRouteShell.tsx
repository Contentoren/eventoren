import { Outlet } from "@tanstack/solid-router"
import { Show } from "solid-js"
import { demoRouteShellStateCreate } from "../state/demoRouteShellStateCreate.ts"
import { DemoControls } from "./DemoControls.tsx"
import { DemoFlowProvider } from "./DemoFlowProvider.tsx"
import { DemoNavbarControls } from "./DemoNavbarControls.tsx"
import { DemoShell } from "./DemoShell.tsx"
import { SiteFrame } from "../../components/SiteFrame.tsx"

export function DemoRouteShell() {
  const state = demoRouteShellStateCreate()

  return (
    <DemoFlowProvider pathname={state.pathname} search={state.search}>
      <Show
        when={state.isDirectory()}
        fallback={
          <SiteFrame header={state.frame.header} footerLinkHref={state.frame.footerLinkHref}>
            <DemoNavbarControls />
            <DemoControls currentId={state.currentId} />
            <Outlet />
          </SiteFrame>
        }
      >
        <DemoShell currentId="directory">
          <Outlet />
        </DemoShell>
      </Show>
    </DemoFlowProvider>
  )
}
