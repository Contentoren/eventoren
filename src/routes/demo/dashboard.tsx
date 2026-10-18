import { ClientOnly, createFileRoute, Outlet } from "@tanstack/solid-router"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DashShell } from "../../dash/ui/shell/DashShell.tsx"
import { DashShellSkeleton } from "../../dash/ui/shell/DashShellSkeleton.tsx"
import { DashCommandPaletteHost } from "../../dash/ui/shell/menus/DashCommandPaletteHost.tsx"
import { DashDemoMenu } from "../../dash/ui/shell/menus/DashDemoMenu.tsx"
import { DashEventSwitcher } from "../../dash/ui/shell/menus/DashEventSwitcher.tsx"
import { DashHelp } from "../../dash/ui/shell/menus/DashHelp.tsx"
import { DashNotifications } from "../../dash/ui/shell/menus/DashNotifications.tsx"
import { DashOrgSwitcher } from "../../dash/ui/shell/menus/DashOrgSwitcher.tsx"
import { DashReviewBanner } from "../../dash/ui/shell/menus/DashReviewBanner.tsx"
import { DashUserMenu } from "../../dash/ui/shell/menus/DashUserMenu.tsx"

export const Route = createFileRoute("/demo/dashboard")({
  head: () =>
    demoRouteHeadCreate(
      "Veranstalter-Dashboard · Eventoren Demo",
      "Lokale Übersicht für Veranstalter mit Kennzahlen, Events und Bestellungen.",
      "/demo/dashboard",
    ),
  component: () => {
    const paletteRequest = createSignalObject(0)
    return (
      <ClientOnly fallback={<DashShellSkeleton />}>
        <DashShell
          orgSwitcher={<DashOrgSwitcher />}
          eventSwitcher={<DashEventSwitcher />}
          help={<DashHelp />}
          userMenu={<DashUserMenu />}
          onSearch={() => paletteRequest.set(paletteRequest.get() + 1)}
          actions={
            <>
              <DashDemoMenu />
              <DashNotifications />
            </>
          }
          banner={<DashReviewBanner />}
        >
          <DashCommandPaletteHost request={paletteRequest.get} />
          <Outlet />
        </DashShell>
      </ClientOnly>
    )
  },
})
