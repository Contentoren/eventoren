import type { JSX } from "solid-js"
import { VeranstalterDashboardMobileDrawer } from "./VeranstalterDashboardMobileDrawer.tsx"
import { VeranstalterDashboardSidebar } from "./VeranstalterDashboardSidebar.tsx"
import { VeranstalterDashboardTopbar } from "./VeranstalterDashboardTopbar.tsx"
import { veranstalterDashboardShellChromeStateCreate } from "./veranstalterDashboardShellChromeStateCreate.ts"
import type { VeranstalterDashboardShellState } from "./veranstalterDashboardShellStateCreate.ts"

/** Veranstalter dashboard shell: sidebar, mobile drawer, topbar, and content. */
export function VeranstalterDashboardShell(p: {
  readonly state: VeranstalterDashboardShellState
  readonly orgId: () => string | undefined
  readonly children?: JSX.Element
}) {
  const chrome = veranstalterDashboardShellChromeStateCreate()
  return (
    <div class="min-h-dvh bg-surface-base text-content">
      <aside class="fixed inset-y-0 left-0 z-40 hidden h-dvh w-[248px] border-r border-border-subtle bg-surface lg:flex lg:flex-col">
        <VeranstalterDashboardSidebar
          currentPath={chrome.currentPath}
          orgId={p.orgId}
          canManageTeam={p.state.canManageTeam}
          canReadOrders={p.state.canReadOrders}
        />
      </aside>
      <VeranstalterDashboardMobileDrawer open={chrome.drawer} label="Veranstalter-Navigation">
        <VeranstalterDashboardSidebar
          currentPath={chrome.currentPath}
          orgId={p.orgId}
          canManageTeam={p.state.canManageTeam}
          canReadOrders={p.state.canReadOrders}
        />
      </VeranstalterDashboardMobileDrawer>
      <div class="lg:pl-[248px]">
        <VeranstalterDashboardTopbar state={p.state} onMenuOpen={chrome.openDrawer} />
        <main id="content" tabindex="-1" class="mx-auto w-full max-w-[1280px] px-4 py-6 pb-10 sm:px-6 lg:px-8 lg:py-8">
          {p.children}
        </main>
      </div>
    </div>
  )
}
