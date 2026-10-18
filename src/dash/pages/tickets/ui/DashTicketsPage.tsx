import { For, Show } from "solid-js"
import { useNavigate } from "@tanstack/solid-router"
import { mdiPlus } from "@adaptive-ds/mdi/mdiPlus.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { DashPageHeader } from "../../../ui/DashPageHeader.tsx"
import { dashActiveOrg } from "../../../store/dashActiveOrg.ts"
import { dashCan } from "../../../store/dashCan.ts"
import { dashEventById } from "../../../store/dashEventById.ts"
import { dashNow } from "../../../store/dashNow.ts"
import { dashStateGet } from "../../../store/dashStateGet.ts"
import type { DashTicketChannel } from "../../../model/dashTicketChannelSchema.ts"
import { DashTicketsStateCreate } from "../DashTicketsStateCreate.ts"
import { DashTicketChannelSection } from "./DashTicketChannelSection.tsx"
import { DashTicketSheet, DashTicketSheetStateCreate } from "./DashTicketSheet.tsx"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

/** Seite „Tickets“: zwei Kanal-Sektionen mit Karten + Sheet (?ticket=<id>|neu). */
export function DashTicketsPage(p: { eventId: string; ticketParam: string | undefined }) {
  const navigate = useNavigate()
  const now = dashNow()
  const listState = DashTicketsStateCreate()
  const refresh = createSignalObject(0)

  const event = () => dashEventById(p.eventId)
  const org = () => dashActiveOrg()
  const canEdit = () => dashCan("tickets.bearbeiten")

  const ticketTypes = () => {
    void refresh.get()
    return dashStateGet()
      .ticketTypes.filter((type) => type.eventId === p.eventId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }
  const orders = () => {
    void refresh.get()
    return dashStateGet().orders.filter((order) => order.eventId === p.eventId)
  }
  const tickets = () => {
    void refresh.get()
    return dashStateGet().tickets.filter((ticket) => ticket.eventId === p.eventId)
  }

  const selectedId = () => p.ticketParam
  const selectedTicket = () => {
    const id = selectedId()
    if (!id || id === "neu") return null
    return ticketTypes().find((type) => type.id === id) ?? null
  }
  const sheetOpen = () => selectedId() !== undefined && (selectedId() === "neu" || selectedTicket() !== null)

  const channelDefault = (): DashTicketChannel => {
    const id = selectedId()
    if (id === "neu") {
      const params = new URLSearchParams(window.location.search)
      return params.get("kanal") === "abendkasse" ? "abendkasse" : "online"
    }
    return selectedTicket()?.channel ?? "online"
  }

  const sheetState = () => {
    void selectedId()
    return DashTicketSheetStateCreate({
      ticket: selectedTicket(),
      channelDefault: channelDefault(),
      taxDefault: org()?.tax.defaultRateBps ?? 700,
    })
  }

  const openTicket = (id: string) => {
    void navigate({
      to: `/demo/dashboard/events/${p.eventId}/tickets` as never,
      search: { ticket: id } as never,
      replace: false,
      resetScroll: false,
    })
  }

  const openNew = (channel: DashTicketChannel) => {
    void navigate({
      to: `/demo/dashboard/events/${p.eventId}/tickets` as never,
      search:
        channel === "abendkasse" ? ({ ticket: "neu", kanal: "abendkasse" } as never) : ({ ticket: "neu" } as never),
      replace: false,
      resetScroll: false,
    })
  }

  return (
    <div>
      <Show when={event()}>
        {(current) => (
          <>
            <DashPageHeader
              title="Tickets"
              description="Ticketarten, Phasen und Kontingente."
              actions={
                <Show when={canEdit()}>
                  <Button type="button" variant="contrast" class="h-9 px-3 text-sm" onClick={() => openNew("online")}>
                    <Icon path={mdiPlus} class="size-4" />
                    Ticketart hinzufügen
                  </Button>
                </Show>
              }
            />
            <div class="flex flex-col gap-6">
              <DashTicketChannelSection
                eventId={p.eventId}
                channel="online"
                title="Online"
                types={ticketTypes()}
                orders={orders()}
                tickets={tickets()}
                now={now()}
                canEdit={canEdit()}
                state={listState}
                onOpen={openTicket}
                onCreate={() => openNew("online")}
                onReordered={() => refresh.set(refresh.get() + 1)}
              />
              <DashTicketChannelSection
                eventId={p.eventId}
                channel="abendkasse"
                title="Abendkasse"
                types={ticketTypes()}
                orders={orders()}
                tickets={tickets()}
                now={now()}
                canEdit={canEdit()}
                state={listState}
                onOpen={openTicket}
                onCreate={() => openNew("abendkasse")}
                onReordered={() => refresh.set(refresh.get() + 1)}
              />
            </div>
            <Show when={sheetOpen()} fallback={null}>
              <DashTicketSheet
                open
                onOpenChange={(open) => {
                  if (!open) refresh.set(refresh.get() + 1)
                }}
                event={current()}
                orgId={org()?.id ?? ""}
                ticket={selectedTicket()}
                channelDefault={channelDefault()}
                orders={orders()}
                tickets={tickets()}
                now={now()}
                state={sheetState()}
              />
            </Show>
          </>
        )}
      </Show>
    </div>
  )
}
