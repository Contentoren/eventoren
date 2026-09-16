import { Outlet } from "@tanstack/solid-router"
import { Show } from "solid-js"
import { demoRouteShellStateCreate } from "../state/demoRouteShellStateCreate.ts"
import { DemoControls } from "./DemoControls.tsx"
import { DemoShell } from "./DemoShell.tsx"
import { SiteFrame } from "../../components/SiteFrame.tsx"

export function DemoRouteShell() {
  const state = demoRouteShellStateCreate()

  return (
    <Show
      when={state.isDirectory()}
      fallback={
        <SiteFrame header={state.frame.header} footerLinkHref={state.frame.footerLinkHref}>
          <DemoControls currentId={state.currentId} />
          <Outlet />
        </SiteFrame>
      }
    >
      <DemoShell currentId="directory">
        <Outlet />
      </DemoShell>
    </Show>
  )
}
