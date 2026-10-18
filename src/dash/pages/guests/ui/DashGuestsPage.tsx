import { Show } from "solid-js"
import { useNavigate } from "@tanstack/solid-router"
import { mdiPlus } from "@adaptive-ds/mdi/mdiPlus.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { DashPageHeader } from "../../../ui/DashPageHeader.tsx"
import { dashStateGet } from "../../../store/dashStateGet.ts"
import { dashCan } from "../../../store/dashCan.ts"
import { dashEventById } from "../../../store/dashEventById.ts"
import { DashGuestsStateCreate } from "../DashGuestsStateCreate.ts"
import { dashGuestQuotaUsed } from "../model/dashGuestQuotaUsed.ts"
import { DashGuestsQuotaCards } from "./DashGuestsQuotaCards.tsx"
import { DashGuestsQuotaSheet } from "./DashGuestsQuotaSheet.tsx"
import { DashGuestsAddSheet } from "./DashGuestsAddSheet.tsx"
import { DashGuestsList } from "./DashGuestsList.tsx"

/** Seite „Gästeliste“: Kontingent-Karten, Gäste-Sheet (?gast=neu) und Gästeliste (?gast=<id>). */
export function DashGuestsPage(p: { eventId: string; search: { gast?: string; kontingent?: string } }) {
  const navigate = useNavigate()
  const state = DashGuestsStateCreate()

  const event = () => dashEventById(p.eventId)
  const canEditGuests = () => dashCan("gaesteliste.bearbeiten")
  const canEditEvents = () => dashCan("events.bearbeiten")
  const canEdit = () => canEditGuests() && canEditEvents()

  const quotas = () =>
    [...dashStateGet().guestQuotas]
      .filter((quota) => quota.eventId === p.eventId)
      .sort((a, b) => a.name.localeCompare(b.name, "de"))

  const guests = () => dashStateGet().guests.filter((guest) => guest.eventId === p.eventId)
  const quotaById = (id: string | null) => quotas().find((quota) => quota.id === id) ?? null

  const usedByQuota = () => {
    const grouped = new Map<string, { plusOnes: number }[]>()
    for (const guest of guests()) {
      if (!guest.quotaId) continue
      const list = grouped.get(guest.quotaId) ?? []
      list.push(guest)
      grouped.set(guest.quotaId, list)
    }
    const used = new Map<string, number>()
    for (const [quotaId, list] of grouped) used.set(quotaId, dashGuestQuotaUsed(list))
    return used
  }

  const emailSentFor = (ticketId: string | null) => {
    if (!ticketId) return false
    return dashStateGet().orders.some(
      (order) =>
        order.eventId === p.eventId &&
        order.emails.some((mail) => mail.kind === "tickets-gaesteliste") &&
        dashStateGet().tickets.some((ticket) => ticket.id === ticketId && ticket.orderId === order.id),
    )
  }

  const rows = () =>
    guests()
      .map((guest) => ({
        ...guest,
        quotaName: guest.quotaId ? (quotaById(guest.quotaId)?.name ?? null) : null,
        ticketSent: emailSentFor(guest.ticketId),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "de"))

  const checkedCount = () => guests().filter((guest) => guest.checkedInAt !== null).length

  const patchSearch = (patch: { gast?: string; kontingent?: string }) => {
    void navigate({
      to: `/demo/dashboard/events/${p.eventId}/gaesteliste` as never,
      search: { ...p.search, ...patch } as never,
      replace: false,
      resetScroll: false,
    })
  }

  const closeSheets = () => {
    const next: Record<string, unknown> = {}
    void navigate({
      to: `/demo/dashboard/events/${p.eventId}/gaesteliste` as never,
      search: next as never,
      replace: true,
      resetScroll: false,
    })
  }

  const openAdd = () => {
    state.single.name.set("")
    state.single.email.set("")
    state.single.plusOnes.set(0)
    state.single.note.set("")
    state.single.sendTicket.set(true)
    state.single.showErrors.set(false)
    state.tab.set("einzeln")
    const firstOpen = quotas().find((quota) => (usedByQuota().get(quota.id) ?? 0) < quota.limit)
    state.single.quotaId.set(firstOpen?.id ?? quotas()[0]?.id ?? "")
    state.bulkQuotaId.set(firstOpen?.id ?? quotas()[0]?.id ?? "")
    patchSearch({ gast: "neu" })
  }

  const openQuotaNew = () => {
    state.editingQuotaId.set(null)
    state.quota.name.set("")
    state.quota.limit.set("")
    state.quota.showErrors.set(false)
    state.quota.confirmDelete.set(false)
    patchSearch({ kontingent: "neu" })
  }

  const openQuotaEdit = (quotaId: string) => {
    const quota = quotaById(quotaId)
    if (!quota) return
    state.editingQuotaId.set(quota.id)
    state.quota.name.set(quota.name)
    state.quota.limit.set(String(quota.limit))
    state.quota.showErrors.set(false)
    state.quota.confirmDelete.set(false)
    patchSearch({ kontingent: quota.id })
  }

  const closeQuota = () => {
    state.editingQuotaId.set(null)
    state.quota.confirmDelete.set(false)
    if (p.search.gast) patchSearch({ kontingent: undefined, gast: p.search.gast })
    else closeSheets()
  }

  const closeAdd = () => {
    if (p.search.kontingent) patchSearch({ gast: undefined, kontingent: p.search.kontingent })
    else closeSheets()
  }

  const quotaSheetOpen = () => p.search.kontingent !== undefined
  const addSheetOpen = () => p.search.gast === "neu"

  return (
    <div>
      <Show when={event()}>
        {(current) => (
          <>
            <DashPageHeader
              title="Gästeliste"
              description={current().title}
              actions={
                <Show when={canEdit()}>
                  <Button type="button" variant="contrast" class="h-9 px-3 text-sm" onClick={openAdd}>
                    <Icon path={mdiPlus} class="size-4" />
                    Gäste hinzufügen
                  </Button>
                </Show>
              }
            />
            <div class="flex flex-col gap-4">
              <DashGuestsQuotaCards
                quotas={quotas()}
                usedByQuota={usedByQuota()}
                canEdit={canEdit()}
                onAdd={openQuotaNew}
                onEdit={(quota) => openQuotaEdit(quota.id)}
                onDelete={(quota) => openQuotaEdit(quota.id)}
              />
              <DashGuestsList
                eventId={p.eventId}
                rows={rows()}
                quotas={quotas()}
                checkedCount={checkedCount()}
                openCount={guests().length - checkedCount()}
                canEdit={canEdit()}
                state={state}
              />
            </div>
            <Show when={quotaSheetOpen() && canEdit()}>
              <DashGuestsQuotaSheet eventId={p.eventId} state={state} open onClose={closeQuota} />
            </Show>
            <Show when={addSheetOpen() && canEdit()}>
              <DashGuestsAddSheet
                eventId={p.eventId}
                quotas={quotas()}
                usedByQuota={usedByQuota()}
                state={state}
                open
                onClose={closeAdd}
              />
            </Show>
          </>
        )}
      </Show>
    </div>
  )
}
