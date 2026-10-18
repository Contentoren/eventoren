import { mdiHistory } from "@adaptive-ds/mdi/mdiHistory.js"
import { mdiReceiptTextOutline } from "@adaptive-ds/mdi/mdiReceiptTextOutline.js"
import { mdiTicketOutline } from "@adaptive-ds/mdi/mdiTicketOutline.js"
import { Show, createEffect } from "solid-js"
import { TabNav } from "#ui/interactive/tabs/TabNav.jsx"
import { Details } from "#ui/interactive/details/Details.jsx"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { Avatar } from "#ui/static/avatar/Avatar.jsx"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { UiContainer } from "../../../ui/UiContainer.tsx"
import { dashStateGet } from "../../store/dashStateGet.ts"
import { dashAccountTickets } from "../model/dashAccountTickets.ts"
import { dashAccountOrders } from "../model/dashAccountOrders.ts"
import { dashAccountStateCreate } from "../dashAccountStateCreate.ts"
import type { DashAccountTab } from "../model/dashAccountTab.ts"
import type { DashAccountOrderRow } from "../model/dashAccountOrderRow.ts"
import type { DashAccountTicketRow } from "../model/dashAccountTicketRow.ts"
import { DashAccountTicketList } from "./DashAccountTicketList.tsx"
import { DashAccountTicketSheet } from "./DashAccountTicketSheet.tsx"
import { DashAccountOrderList } from "./DashAccountOrderList.tsx"
import { DashAccountOrderSheet } from "./DashAccountOrderSheet.tsx"
import { DashAccountProfile } from "./DashAccountProfile.tsx"

const accountEmail = "lea.schneider@example.de"

const tabItems: { id: DashAccountTab; label: string; icon: string }[] = [
  { id: "tickets", label: "Tickets", icon: mdiTicketOutline },
  { id: "bestellungen", label: "Bestellungen", icon: mdiReceiptTextOutline },
  { id: "profil", label: "Profil", icon: mdiHistory },
]

export function DashAccountPage(p: {
  tab: DashAccountTab
  ticketId: string | null
  orderId: string | null
  onTab: (tab: DashAccountTab) => void
  onTicket: (ticketId: string | null) => void
  onOrder: (orderId: string | null) => void
}) {
  const state = dashAccountStateCreate({ tab: p.tab, ticketId: p.ticketId, orderId: p.orderId })

  const snapshot = () => dashStateGet()
  const tickets = () =>
    dashAccountTickets({
      tickets: snapshot().tickets,
      events: snapshot().events,
      ticketTypes: snapshot().ticketTypes,
      email: accountEmail,
      nowIso: new Date().toISOString(),
    })
  const orders = () => dashAccountOrders({ orders: snapshot().orders, events: snapshot().events, email: accountEmail })

  const activeTicket = (): DashAccountTicketRow | null => {
    const id = p.ticketId
    if (!id) return null
    return [...tickets().upcoming, ...tickets().past].find((row) => row.ticket.id === id) ?? null
  }
  const activeOrder = (): DashAccountOrderRow | null => {
    const id = p.orderId
    if (!id) return null
    return orders().find((row) => row.order.id === id) ?? null
  }
  const activeOrg = () => {
    const order = activeOrder()
    if (!order) return null
    return snapshot().orgs.find((org) => org.id === order.order.orgId) ?? null
  }

  const selectTab = (id: string) => {
    const next = id === "bestellungen" || id === "profil" ? id : ("tickets" as DashAccountTab)
    state.setTab(next)
    p.onTab(next)
  }

  createEffect(() => {
    const external = p.tab
    if (external !== state.tab()) state.setTab(external)
  })

  return (
    <UiContainer class="flex flex-col gap-6 py-6 sm:py-10">
      <header class="flex items-center gap-4">
        <Avatar name="Lea Schneider" size="lg" shape="circle" />
        <div class="min-w-0">
          <p class="text-xs font-medium uppercase tracking-wide text-content-muted">Mein Konto</p>
          <h1 class="truncate text-2xl font-semibold">Lea Schneider</h1>
          <p class="truncate text-sm text-content-muted">{accountEmail}</p>
        </div>
      </header>

      <div class="border-b border-border-subtle">
        <TabNav
          ariaLabel="Konto-Bereiche"
          active={state.tab()}
          onSelect={selectTab}
          items={tabItems.map((item) => ({
            id: item.id,
            label: item.label,
            icon: item.icon,
            count:
              item.id === "tickets"
                ? tickets().upcoming.length
                : item.id === "bestellungen"
                  ? orders().length
                  : undefined,
          }))}
        />
      </div>

      <Show when={state.tab() === "tickets"}>
        <div class="flex flex-col gap-4">
          <Show
            when={tickets().upcoming.length > 0}
            fallback={
              <div class="rounded-card border border-border-subtle bg-surface">
                <EmptyState
                  icon={mdiTicketOutline}
                  title="Noch keine Tickets"
                  description="Stöbere durch die Events und sichere dir deine nächsten Tickets."
                  actions={
                    <LinkButtonInternal to="/demo/customer/events" variant="contrast" size="sm">
                      Events entdecken
                    </LinkButtonInternal>
                  }
                />
              </div>
            }
          >
            <DashAccountTicketList rows={tickets().upcoming} onOpen={(id) => p.onTicket(id)} />
          </Show>
          <Show when={tickets().past.length > 0}>
            <Details
              title="Vergangene Tickets"
              subtitle={`${tickets().past.length} ${tickets().past.length === 1 ? "Ticket" : "Tickets"}`}
            >
              <div class="border-t border-border-subtle p-4">
                <DashAccountTicketList rows={tickets().past} compact onOpen={(id) => p.onTicket(id)} />
              </div>
            </Details>
          </Show>
        </div>
      </Show>

      <Show when={state.tab() === "bestellungen"}>
        <Show
          when={orders().length > 0}
          fallback={
            <div class="rounded-card border border-border-subtle bg-surface">
              <EmptyState
                icon={mdiReceiptTextOutline}
                title="Noch keine Bestellungen"
                description="Deine Bestellungen mit Rechnungen findest du hier."
                actions={
                  <LinkButtonInternal to="/demo/customer/events" variant="contrast" size="sm">
                    Events entdecken
                  </LinkButtonInternal>
                }
              />
            </div>
          }
        >
          <DashAccountOrderList rows={orders()} onOpen={(id) => p.onOrder(id)} />
        </Show>
      </Show>

      <Show when={state.tab() === "profil"}>
        <DashAccountProfile />
      </Show>

      <DashAccountTicketSheet
        row={activeTicket()}
        open={activeTicket() !== null}
        onOpenChange={(open) => {
          if (!open) p.onTicket(null)
        }}
      />
      <DashAccountOrderSheet
        row={activeOrder()}
        org={activeOrg()}
        open={activeOrder() !== null}
        onOpenChange={(open) => {
          if (!open) p.onOrder(null)
        }}
      />
    </UiContainer>
  )
}
