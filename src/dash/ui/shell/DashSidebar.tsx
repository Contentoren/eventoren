import { mdiAccountGroupOutline } from "@adaptive-ds/mdi/mdiAccountGroupOutline.js"
import { mdiAccountMultipleOutline } from "@adaptive-ds/mdi/mdiAccountMultipleOutline.js"
import { mdiAccountStarOutline } from "@adaptive-ds/mdi/mdiAccountStarOutline.js"
import { mdiBankOutline } from "@adaptive-ds/mdi/mdiBankOutline.js"
import { mdiCalendarMonthOutline } from "@adaptive-ds/mdi/mdiCalendarMonthOutline.js"
import { mdiCashRegister } from "@adaptive-ds/mdi/mdiCashRegister.js"
import { mdiChartBoxOutline } from "@adaptive-ds/mdi/mdiChartBoxOutline.js"
import { mdiChevronLeft } from "@adaptive-ds/mdi/mdiChevronLeft.js"
import { mdiCogOutline } from "@adaptive-ds/mdi/mdiCogOutline.js"
import { mdiEmailOutline } from "@adaptive-ds/mdi/mdiEmailOutline.js"
import { mdiGiftOutline } from "@adaptive-ds/mdi/mdiGiftOutline.js"
import { mdiHelpCircleOutline } from "@adaptive-ds/mdi/mdiHelpCircleOutline.js"
import { mdiHistory } from "@adaptive-ds/mdi/mdiHistory.js"
import { mdiMagnify } from "@adaptive-ds/mdi/mdiMagnify.js"
import { mdiPencilOutline } from "@adaptive-ds/mdi/mdiPencilOutline.js"
import { mdiQrcodeScan } from "@adaptive-ds/mdi/mdiQrcodeScan.js"
import { mdiReceiptTextOutline } from "@adaptive-ds/mdi/mdiReceiptTextOutline.js"
import { mdiScaleBalance } from "@adaptive-ds/mdi/mdiScaleBalance.js"
import { mdiStorefrontOutline } from "@adaptive-ds/mdi/mdiStorefrontOutline.js"
import { mdiTicketOutline } from "@adaptive-ds/mdi/mdiTicketOutline.js"
import { mdiTicketPercentOutline } from "@adaptive-ds/mdi/mdiTicketPercentOutline.js"
import { mdiUnfoldMoreHorizontal } from "@adaptive-ds/mdi/mdiUnfoldMoreHorizontal.js"
import { mdiViewDashboardOutline } from "@adaptive-ds/mdi/mdiViewDashboardOutline.js"
import { Link, useLocation } from "@tanstack/solid-router"
import { cn } from "cn"
import type { JSX } from "solid-js"
import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { Avatar } from "#ui/static/avatar/Avatar.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { Kbd } from "#ui/static/kbd/Kbd.jsx"
import { eventDateFormat } from "../../../events/eventDateFormat.ts"
import { dashEventById } from "../../store/dashEventById.ts"
import type { DashNavItem } from "./dashNavItemsCreate.ts"
import { dashSidebarStateCreate } from "./dashSidebarStateCreate.ts"

export interface DashSidebarProps {
  orgSwitcher?: JSX.Element
  eventSwitcher?: JSX.Element
  help?: JSX.Element
  userMenu?: JSX.Element
  onSearch?: () => void
  onNavigate?: () => void
}

const dashNavIcons: Record<string, string> = {
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

export function DashSidebar(p: DashSidebarProps) {
  const state = dashSidebarStateCreate()
  return (
    <div class="flex h-full min-h-0 flex-col">
      <div class="p-3">
        <Show when={p.orgSwitcher} fallback={<DashOrgSwitcherFallback onNavigate={p.onNavigate} />}>
          {p.orgSwitcher}
        </Show>
        <Show when={!state.eventContext()}>
          <Button
            variant={buttonVariant.ghost}
            class="mt-1 h-9 w-full justify-start gap-2 px-2.5 text-sm font-normal text-content-muted"
            onClick={() => p.onSearch?.()}
            aria-label="Suchen öffnen"
            title="Suchen (⌘K)"
          >
            <Icon path={mdiMagnify} class="size-4 shrink-0" />
            <span class="flex-1 text-left">Suchen</span>
            <Kbd>⌘K</Kbd>
          </Button>
        </Show>
      </div>
      <nav aria-label="Dashboard-Navigation" class="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <Show when={state.eventContext()} fallback={<DashOrgNav items={state.orgNav()} onNavigate={p.onNavigate} />}>
          {(context) => <DashEventNav context={context()} eventSwitcher={p.eventSwitcher} onNavigate={p.onNavigate} />}
        </Show>
      </nav>
      <div class="border-t border-border-subtle p-3">
        <Show when={p.help} fallback={<DashHelpFallback />}>
          {p.help}
        </Show>
        <Show when={p.userMenu} fallback={<DashUserFallback />}>
          {p.userMenu}
        </Show>
      </div>
    </div>
  )
}

function DashOrgSwitcherFallback(p: { onNavigate?: () => void }) {
  const state = dashSidebarStateCreate()
  return (
    <div class="flex h-12 w-full items-center gap-2.5 rounded-control px-2 py-1.5">
      <Avatar
        name={state.org()?.name ?? "–"}
        src={state.org()?.logoDataUrl ?? null}
        size="md"
        shape="rounded"
        class="size-8 text-xs"
      />
      <span class="min-w-0 flex-1 text-left leading-tight">
        <span class="block truncate text-sm font-semibold text-content">{state.org()?.name ?? "–"}</span>
        <Show when={state.roleLabel()}>
          {(label) => <span class="block truncate text-xs text-content-muted">{label()}</span>}
        </Show>
      </span>
      <Icon path={mdiUnfoldMoreHorizontal} class="size-4 shrink-0 text-content-muted" />
    </div>
  )
}

function DashNavLink(p: { item: DashNavItem; onNavigate?: () => void }) {
  const location = useLocation()
  const active = () =>
    p.item.match === "exact" ? location().pathname === p.item.to : location().pathname.startsWith(p.item.to)
  return (
    <Link
      to={p.item.to}
      onClick={() => p.onNavigate?.()}
      aria-current={active() ? "page" : undefined}
      class={cn(
        "flex h-9 items-center gap-2.5 rounded-control px-2.5 text-sm transition-colors",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active()
          ? "bg-surface-muted font-medium text-content"
          : "text-content-muted hover:bg-surface-muted hover:text-content",
      )}
    >
      <Icon path={dashNavIcons[p.item.icon] ?? mdiViewDashboardOutline} class="size-[18px] shrink-0" />
      <span class="min-w-0 flex-1 truncate text-left">{p.item.label}</span>
      <Show when={p.item.liveDot}>
        <span class="size-2 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400" aria-label="Live" />
      </Show>
      <Show when={p.item.count !== undefined}>
        <span class="shrink-0 text-xs tabular-nums text-content-muted">{p.item.count}</span>
      </Show>
    </Link>
  )
}

function DashOrgNav(p: { items: { main: DashNavItem[]; section?: DashNavItem[] }; onNavigate?: () => void }) {
  return (
    <div class="flex flex-col gap-0.5">
      <For each={p.items.main}>{(item) => <DashNavLink item={item} onNavigate={p.onNavigate} />}</For>
      <Show when={p.items.section && p.items.section.length > 0}>
        <p class="mt-6 mb-1 px-2.5 text-[11px] font-semibold tracking-wider text-content-muted uppercase">
          Organisation
        </p>
        <For each={p.items.section}>{(item) => <DashNavLink item={item} onNavigate={p.onNavigate} />}</For>
      </Show>
    </div>
  )
}

function DashEventNav(p: {
  context: { eventId: string; title: string; imageUrl: string; live: boolean; items: DashNavItem[] }
  eventSwitcher?: JSX.Element
  onNavigate?: () => void
}) {
  const detail = () => dashEventById(p.context.eventId)
  return (
    <div class="flex flex-col gap-0.5">
      <Link
        to="/demo/dashboard/events"
        onClick={() => p.onNavigate?.()}
        class="flex h-9 items-center gap-1 rounded-control px-2.5 text-sm text-content-muted transition-colors hover:bg-surface-muted hover:text-content"
      >
        <Icon path={mdiChevronLeft} class="size-4 shrink-0" />
        <span>Alle Events</span>
      </Link>
      <Show when={p.eventSwitcher} fallback={<DashEventCardFallback />}>
        {p.eventSwitcher}
      </Show>
      <div class="mt-2 flex flex-col gap-0.5">
        <For each={p.context.items}>{(item) => <DashNavLink item={item} onNavigate={p.onNavigate} />}</For>
      </div>
    </div>
  )
  function DashEventCardFallback() {
    const info = () => detail()
    return (
      <div class="mt-1 flex items-center gap-2.5 rounded-control px-2 py-1.5">
        <Show
          when={info()?.imageUrl}
          fallback={<span class="h-7 w-10 shrink-0 rounded-md bg-surface-muted" aria-hidden="true" />}
        >
          <img src={info()?.imageUrl} alt="" class="h-7 w-10 shrink-0 rounded-md object-cover" loading="lazy" />
        </Show>
        <span class="min-w-0 flex-1 leading-tight">
          <span class="block truncate text-sm font-medium text-content">{p.context.title}</span>
          <Show when={info()}>
            {(event) => (
              <span class="block truncate text-xs text-content-muted">{eventDateFormat(event().startsAt)}</span>
            )}
          </Show>
        </span>
        <Show when={p.context.live}>
          <span class="size-2 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400" aria-label="Live" />
        </Show>
      </div>
    )
  }
}

function DashHelpFallback() {
  return (
    <span class="flex h-9 cursor-default items-center gap-2.5 rounded-control px-2.5 text-sm text-content-muted">
      <Icon path={mdiHelpCircleOutline} class="size-[18px] shrink-0" />
      <span>Hilfe</span>
    </span>
  )
}

function DashUserFallback() {
  const state = dashSidebarStateCreate()
  return (
    <div class="mt-1 flex items-center gap-2.5 rounded-control px-2 py-1.5">
      <Avatar name={state.user()?.name ?? "–"} size="sm" />
      <span class="min-w-0 flex-1 leading-tight">
        <span class="block truncate text-sm font-medium text-content">{state.user()?.name ?? "–"}</span>
        <span class="block truncate text-xs text-content-muted">{state.user()?.email ?? ""}</span>
      </span>
    </div>
  )
}
