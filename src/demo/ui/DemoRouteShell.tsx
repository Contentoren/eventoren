import { Outlet } from "@tanstack/solid-router"
import { Show } from "solid-js"
import { Toaster } from "#ui/interactive/toast/Toaster.jsx"
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
      <Toaster />
      <Show
        when={state.isDirectory()}
        fallback={
          <Show when={!state.isFullscreen()} fallback={<Outlet />}>
            <SiteFrame header={state.frame.header} footerLinkHref={state.frame.footerLinkHref}>
              <DemoNavbarControls />
              <DemoControls currentId={state.currentId} />
              <Outlet />
            </SiteFrame>
          </Show>
        }
      >
        <DemoShell currentId="directory">
          <Outlet />
        </DemoShell>
      </Show>
    </DemoFlowProvider>
  )
}
