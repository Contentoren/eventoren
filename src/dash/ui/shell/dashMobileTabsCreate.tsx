import { mdiCalendarMonthOutline } from "@adaptive-ds/mdi/mdiCalendarMonthOutline.js"
import { mdiQrcodeScan } from "@adaptive-ds/mdi/mdiQrcodeScan.js"
import { mdiReceiptTextOutline } from "@adaptive-ds/mdi/mdiReceiptTextOutline.js"
import { mdiViewDashboardOutline } from "@adaptive-ds/mdi/mdiViewDashboardOutline.js"
import type { JSX } from "solid-js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { dashActiveOrg } from "../../store/dashActiveOrg.ts"
import { dashCan } from "../../store/dashCan.ts"
import { dashNow } from "../../store/dashNow.ts"
import { dashOrgEvents } from "../../store/dashOrgEvents.ts"

export interface DashMobileTabEntry {
  label: string
  to: string
  icon: JSX.Element
  active: boolean
}

export function dashMobileTabsCreate(pathname: string): DashMobileTabEntry[] {
  const org = dashActiveOrg()
  const tabs: DashMobileTabEntry[] = [
    {
      label: "Übersicht",
      to: "/demo/dashboard",
      icon: <Icon path={mdiViewDashboardOutline} class="size-6" />,
      active: pathname === "/demo/dashboard",
    },
    {
      label: "Events",
      to: "/demo/dashboard/events",
      icon: <Icon path={mdiCalendarMonthOutline} class="size-6" />,
      active: pathname.startsWith("/demo/dashboard/events"),
    },
  ]
  if (dashCan("bestellungen.sehen")) {
    tabs.push({
      label: "Bestellungen",
      to: "/demo/dashboard/bestellungen",
      icon: <Icon path={mdiReceiptTextOutline} class="size-6" />,
      active: pathname.startsWith("/demo/dashboard/bestellungen"),
    })
  }
  const entryTarget = dashMobileEntryTarget()
  if (org && entryTarget) {
    tabs.push({
      label: "Einlass",
      to: entryTarget,
      icon: <Icon path={mdiQrcodeScan} class="size-6" />,
      active: pathname.endsWith("/einlass"),
    })
  }
  return tabs
}

function dashMobileEntryTarget(): string | null {
  const org = dashActiveOrg()
  if (!org) return null
  const now = dashNow()()
  const events = dashOrgEvents(org.id)
  const live = events.find((event) => new Date(event.doorsAt ?? event.startsAt) <= now && new Date(event.endsAt) > now)
  const target =
    live ??
    events.filter((event) => new Date(event.startsAt) >= now).sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1))[0]
  return target ? `/demo/dashboard/events/${target.id}/einlass` : null
}
