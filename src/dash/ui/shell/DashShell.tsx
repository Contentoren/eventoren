import { useLocation } from "@tanstack/solid-router"
import type { JSX } from "solid-js"
import { Show } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { DashMobileDrawer } from "./DashMobileDrawer.tsx"
import { DashMobileTabBar } from "./DashMobileTabBar.tsx"
import { DashNoOrgState, dashNoOrgVisible } from "./DashNoOrgState.tsx"
import { DashSidebar, type DashSidebarProps } from "./DashSidebar.tsx"
import { DashTopbar } from "./DashTopbar.tsx"
import { dashMobileTabsCreate } from "./dashMobileTabsCreate.tsx"
import { dashShellStateCreate } from "./dashShellStateCreate.ts"

export interface DashShellProps
  extends Pick<DashSidebarProps, "orgSwitcher" | "eventSwitcher" | "help" | "userMenu" | "onSearch"> {
  actions?: JSX.Element
  banner?: JSX.Element
  children?: JSX.Element
}

export function DashShell(p: DashShellProps) {
  const state = dashShellStateCreate()
  const location = useLocation()
  const drawerOpen = createSignalObject(false)
  const closeDrawer = () => drawerOpen.set(false)
  const tabs = () => dashMobileTabsCreate(location().pathname)
  return (
    <Show when={!dashNoOrgVisible()} fallback={<DashNoOrgState />}>
      <div class="min-h-dvh bg-surface-base text-content">
        <aside class="fixed inset-y-0 left-0 z-40 hidden h-dvh w-[248px] border-r border-border-subtle bg-surface lg:flex lg:flex-col">
          <DashSidebar
            orgSwitcher={p.orgSwitcher}
            eventSwitcher={p.eventSwitcher}
            help={p.help}
            userMenu={p.userMenu}
            onSearch={p.onSearch}
          />
        </aside>
        <DashMobileDrawer open={drawerOpen} label="Dashboard-Navigation">
          <DashSidebar
            orgSwitcher={p.orgSwitcher}
            eventSwitcher={p.eventSwitcher}
            help={p.help}
            userMenu={p.userMenu}
            onSearch={() => {
              closeDrawer()
              p.onSearch?.()
            }}
            onNavigate={closeDrawer}
          />
        </DashMobileDrawer>
        <div class="lg:pl-[248px]">
          <DashTopbar actions={p.actions} onMenuOpen={() => drawerOpen.set(true)} />
          <main
            id={state.drawerLabelId}
            class="mx-auto w-full max-w-[1280px] px-4 py-6 pb-[calc(4rem+env(safe-area-inset-bottom)+1.5rem)] sm:px-6 lg:px-8 lg:py-8 lg:pb-10"
          >
            {p.banner}
            {p.children}
          </main>
        </div>
        <div aria-hidden="true" class="h-16 lg:hidden" />
        <DashMobileTabBar tabs={tabs()} onMore={() => drawerOpen.set(true)} />
      </div>
    </Show>
  )
}
