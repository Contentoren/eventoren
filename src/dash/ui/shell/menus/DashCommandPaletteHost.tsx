import { mdiAccountGroupOutline } from "@adaptive-ds/mdi/mdiAccountGroupOutline.js"
import { mdiAccountMultipleOutline } from "@adaptive-ds/mdi/mdiAccountMultipleOutline.js"
import { mdiAccountStarOutline } from "@adaptive-ds/mdi/mdiAccountStarOutline.js"
import { mdiBankOutline } from "@adaptive-ds/mdi/mdiBankOutline.js"
import { mdiCalendarMonthOutline } from "@adaptive-ds/mdi/mdiCalendarMonthOutline.js"
import { mdiCashRegister } from "@adaptive-ds/mdi/mdiCashRegister.js"
import { mdiChartBoxOutline } from "@adaptive-ds/mdi/mdiChartBoxOutline.js"
import { mdiCogOutline } from "@adaptive-ds/mdi/mdiCogOutline.js"
import { mdiEmailOutline } from "@adaptive-ds/mdi/mdiEmailOutline.js"
import { mdiGiftOutline } from "@adaptive-ds/mdi/mdiGiftOutline.js"
import { mdiHistory } from "@adaptive-ds/mdi/mdiHistory.js"
import { mdiMagnify } from "@adaptive-ds/mdi/mdiMagnify.js"
import { mdiPencilOutline } from "@adaptive-ds/mdi/mdiPencilOutline.js"
import { mdiQrcodeScan } from "@adaptive-ds/mdi/mdiQrcodeScan.js"
import { mdiReceiptTextOutline } from "@adaptive-ds/mdi/mdiReceiptTextOutline.js"
import { mdiScaleBalance } from "@adaptive-ds/mdi/mdiScaleBalance.js"
import { mdiStorefrontOutline } from "@adaptive-ds/mdi/mdiStorefrontOutline.js"
import { mdiTicketOutline } from "@adaptive-ds/mdi/mdiTicketOutline.js"
import { mdiTicketPercentOutline } from "@adaptive-ds/mdi/mdiTicketPercentOutline.js"
import { mdiViewDashboardOutline } from "@adaptive-ds/mdi/mdiViewDashboardOutline.js"
import { useLocation, useNavigate } from "@tanstack/solid-router"
import { createEffect, Show } from "solid-js"
import type { DashPermission } from "#src/dash/model/dashPermissionSchema.ts"
import { dashActiveOrg } from "#src/dash/store/dashActiveOrg.ts"
import { dashCan } from "#src/dash/store/dashCan.ts"
import { dashStateGet } from "#src/dash/store/dashStateGet.ts"
import { CommandPalette } from "#ui/interactive/command/CommandPalette.jsx"
import { commandPaletteShortcutRegister } from "#ui/interactive/command/commandPaletteShortcutRegister.js"
import { themeRotate } from "#ui/interactive/theme/themeSignal.js"
import { dashCommandPaletteHostStateCreate } from "./dashCommandPaletteHostStateCreate.ts"
import { dashPaletteGroupsCreate } from "./dashPaletteGroupsCreate.ts"

const dashPaletteIcons: Record<string, string> = {
  dashboard: mdiViewDashboardOutline,
  events: mdiCalendarMonthOutline,
  orders: mdiReceiptTextOutline,
  vouchers: mdiGiftOutline,
  finance: mdiBankOutline,
  profile: mdiStorefrontOutline,
  team: mdiAccountGroupOutline,
  settings: mdiCogOutline,
  eventOverview: mdiChartBoxOutline,
  details: mdiPencilOutline,
  tickets: mdiTicketOutline,
  codes: mdiTicketPercentOutline,
  attendees: mdiAccountMultipleOutline,
  guestlist: mdiAccountStarOutline,
  entry: mdiQrcodeScan,
  boxOffice: mdiCashRegister,
  messages: mdiEmailOutline,
  settlement: mdiScaleBalance,
  log: mdiHistory,
}

function dashCurrentEventId(pathname: string): string | null {
  const match = pathname.match(/^\/demo\/dashboard\/events\/([^/]+)/)
  if (!match?.[1] || match[1] === "neu") return null
  return match[1]
}

/** Befehlspalette (⌘K): Seiten, Events, Bestellungen, Aktionen. Öffnen via Slot `onSearch`. */
export function DashCommandPaletteHost(p: { request: () => number }) {
  const state = dashCommandPaletteHostStateCreate()
  const navigate = useNavigate()
  const location = useLocation()
  commandPaletteShortcutRegister(() => state.requestOpen())
  const navigateTo = (to: string) => {
    const [path, search] = to.split("?")
    if (search) void navigate({ to: `${path}?${search}` })
    else void navigate({ to: path })
  }
  createEffect(() => {
    if (p.request() > 0) state.requestOpen()
  })
  const groups = () => {
    const org = dashActiveOrg()
    if (!org) return []
    const permissions = new Set<DashPermission>()
    const all: Array<DashPermission> = [
      "events.bearbeiten",
      "tickets.bearbeiten",
      "codes.bearbeiten",
      "bestellungen.sehen",
      "bestellungen.verwalten",
      "bestellungen.erstatten",
      "gaesteliste.bearbeiten",
      "nachrichten.senden",
      "einlass.nutzen",
      "abendkasse.nutzen",
      "abendkasse.preise",
      "umsatz.sehen",
      "finanzen.sehen",
      "gutscheine.bearbeiten",
      "profil.bearbeiten",
      "team.verwalten",
      "einstellungen.bearbeiten",
      "bank.bearbeiten",
    ]
    for (const permission of all) {
      if (dashCan(permission)) permissions.add(permission)
    }
    return dashPaletteGroupsCreate({
      state: dashStateGet(),
      orgId: org.id,
      permissions,
      query: state.query.get(),
      currentEventId: dashCurrentEventId(location().pathname),
      navigate: navigateTo,
      toggleTheme: () => themeRotate(),
    }).map((group) => ({
      ...group,
      items: group.items.map((item) => ({
        ...item,
        icon: item.icon ? (dashPaletteIcons[item.icon] ?? mdiMagnify) : undefined,
      })),
    }))
  }
  return (
    <Show when={dashActiveOrg() !== null}>
      <span
        onInput={(event) => {
          const target = event.target
          if (target instanceof HTMLInputElement && target.getAttribute("role") === "combobox") {
            state.query.set(target.value)
          }
        }}
      >
        <CommandPalette
          open={state.open.get()}
          onOpenChange={(next) => state.setOpen(next)}
          groups={groups()}
          placeholder="Suchen oder Befehl eingeben …"
          emptyText="Keine Treffer"
        />
      </span>
    </Show>
  )
}
