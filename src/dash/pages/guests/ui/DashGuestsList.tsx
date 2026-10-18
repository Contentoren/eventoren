import { For, Show } from "solid-js"
import { mdiCheck } from "@adaptive-ds/mdi/mdiCheck.js"
import { mdiDotsVertical } from "@adaptive-ds/mdi/mdiDotsVertical.js"
import { mdiEmailFastOutline } from "@adaptive-ds/mdi/mdiEmailFastOutline.js"
import { mdiUndo } from "@adaptive-ds/mdi/mdiUndo.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ConfirmDialog } from "#ui/interactive/dialog/ConfirmDialog.jsx"
import { DropdownMenu } from "#ui/interactive/menu/DropdownMenu.jsx"
import { FilterChip } from "#ui/interactive/chip/FilterChip.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { mdiAccountStarOutline } from "@adaptive-ds/mdi/mdiAccountStarOutline.js"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import type { DashGuest } from "../../../model/dashGuestSchema.ts"
import type { DashGuestQuota } from "../../../model/dashGuestQuotaSchema.ts"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import { dashGuestCheckIn } from "../../../store/actions/guests/dashGuestCheckIn.ts"
import { dashGuestCheckInUndo } from "../../../store/actions/guests/dashGuestCheckInUndo.ts"
import { dashGuestDelete } from "../../../store/actions/guests/dashGuestDelete.ts"
import { dashGuestTicketSend } from "../../../store/actions/guests/dashGuestTicketSend.ts"
import { dashStateGet } from "../../../store/dashStateGet.ts"
import type { DashGuestsState } from "../DashGuestsStateCreate.ts"

export type DashGuestRow = DashGuest & { quotaName: string | null; ticketSent: boolean }

/** Gästeliste: Suche, Filter-Chips und Zeilen mit Ticket- und Check-in-Aktionen. */
export function DashGuestsList(p: {
  eventId: string
  rows: DashGuestRow[]
  quotas: DashGuestQuota[]
  checkedCount: number
  openCount: number
  canEdit: boolean
  state: DashGuestsState
}) {
  const query = () => p.state.query.get()
  const status = () => p.state.statusFilter.get()
  const quotaFilter = () => p.state.quotaFilter.get()

  const filtered = () => {
    const needle = query().trim().toLowerCase()
    return p.rows.filter((row) => {
      if (status() === "eingecheckt" && row.checkedInAt === null) return false
      if (status() === "offen" && row.checkedInAt !== null) return false
      if (quotaFilter() !== null && row.quotaId !== quotaFilter()) return false
      if (needle === "") return true
      return (
        row.name.toLowerCase().includes(needle) ||
        row.email.toLowerCase().includes(needle) ||
        (row.quotaName ?? "").toLowerCase().includes(needle)
      )
    })
  }

  const filtering = () => query().trim() !== "" || status() !== "alle" || quotaFilter() !== null

  const subtitle = () =>
    filtering()
      ? `${filtered().length} von ${p.rows.length} ${p.rows.length === 1 ? "Gast" : "Gästen"} · ${p.checkedCount} eingecheckt`
      : `${p.rows.length} ${p.rows.length === 1 ? "Gast" : "Gäste"} · ${p.checkedCount} eingecheckt`

  const checkIn = (row: DashGuestRow) => {
    const result = dashGuestCheckIn(row.id)
    if (!result.success) toastAdd({ title: result.errorMessage, variant: "error" })
    else toastAdd({ title: `„${row.name}“ eingecheckt`, variant: "success" })
  }

  const checkInUndo = (row: DashGuestRow) => {
    const result = dashGuestCheckInUndo(row.id)
    if (!result.success) toastAdd({ title: result.errorMessage, variant: "error" })
    else toastAdd({ title: `Check-in von „${row.name}“ zurückgenommen`, variant: "success" })
  }

  const sendTicket = (row: DashGuestRow) => {
    const result = dashGuestTicketSend(row.id)
    if (!result.success) toastAdd({ title: result.errorMessage, variant: "error" })
    else toastAdd({ title: `Ticket an „${row.name}“ gesendet`, variant: "success" })
  }

  const remove = (row: DashGuestRow) => {
    const result = dashGuestDelete(row.id)
    p.state.confirmDelete.set(null)
    if (!result.success) toastAdd({ title: result.errorMessage, variant: "error" })
    else toastAdd({ title: `Gast „${row.name}“ entfernt`, variant: "success" })
  }

  const confirmRow = (): DashGuestRow | null => {
    const id = p.state.confirmDelete.get()
    if (!id) return null
    return p.rows.find((row) => row.id === id) ?? null
  }

  return (
    <DashSection title="Gäste" description={subtitle()}>
      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            class="h-9 text-sm rounded-control sm:max-w-64"
            value={query()}
            onInput={(event) => p.state.query.set(event.currentTarget.value)}
            placeholder="Name, E-Mail oder Kontingent suchen"
            aria-label="Gäste suchen"
          />
          <div class="flex flex-wrap gap-1.5">
            <FilterChip active={status() === "alle"} onClick={() => p.state.statusFilter.set("alle")}>
              Alle
            </FilterChip>
            <FilterChip
              active={status() === "eingecheckt"}
              onClick={() => p.state.statusFilter.set("eingecheckt")}
              count={p.checkedCount}
            >
              Eingecheckt
            </FilterChip>
            <FilterChip
              active={status() === "offen"}
              onClick={() => p.state.statusFilter.set("offen")}
              count={p.openCount}
            >
              Offen
            </FilterChip>
          </div>
        </div>
        <Show when={p.quotas.length > 0}>
          <div class="flex flex-wrap gap-1.5">
            <FilterChip active={quotaFilter() === null} onClick={() => p.state.quotaFilter.set(null)}>
              Alle Kontingente
            </FilterChip>
            <For each={p.quotas}>
              {(quota) => (
                <FilterChip
                  active={quotaFilter() === quota.id}
                  onClick={() => p.state.quotaFilter.set(quotaFilter() === quota.id ? null : quota.id)}
                >
                  {quota.name}
                </FilterChip>
              )}
            </For>
          </div>
        </Show>
        <Show
          when={filtered().length > 0}
          fallback={
            <EmptyState
              icon={mdiAccountStarOutline}
              title="Keine Gäste gefunden"
              description="Passe die Suche an oder füge neue Gäste hinzu."
            />
          }
        >
          <ul class="flex flex-col gap-2">
            <For each={filtered()}>
              {(row) => {
                const sent = () =>
                  row.ticketSent ||
                  dashStateGet()
                    .orders.filter((order) => order.eventId === p.eventId && order.channel === "gaesteliste")
                    .some((order) =>
                      dashStateGet().tickets.some(
                        (ticket) => ticket.id === row.ticketId && ticket.orderId === order.id,
                      ),
                    )
                return (
                  <li class="flex flex-col gap-2 rounded-card border border-border-subtle bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div class="min-w-0">
                      <p class="truncate text-sm font-semibold text-content">
                        {row.name}
                        <Show when={row.plusOnes > 0}>
                          <span class="ml-1.5 text-xs font-medium text-content-muted">+{row.plusOnes}</span>
                        </Show>
                      </p>
                      <p class="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-content-muted">
                        <Show when={row.quotaName}>
                          {(name) => (
                            <span class="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 font-medium">
                              {name()}
                            </span>
                          )}
                        </Show>
                        <Show when={row.email !== ""}>
                          <span class="truncate">{row.email}</span>
                        </Show>
                        <Show when={row.note !== ""}>
                          <span class="truncate">· {row.note}</span>
                        </Show>
                      </p>
                    </div>
                    <div class="flex flex-wrap items-center gap-1.5">
                      <Show
                        when={sent()}
                        fallback={
                          <Show
                            when={p.canEdit && row.email !== ""}
                            fallback={
                              <span class="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-1 text-xs text-content-muted">
                                Kein Ticket
                              </span>
                            }
                          >
                            <Button
                              type="button"
                              variant="outline"
                              class="h-9 px-3 text-sm"
                              onClick={() => sendTicket(row)}
                            >
                              <Icon path={mdiEmailFastOutline} class="size-4" />
                              Ticket senden
                            </Button>
                          </Show>
                        }
                      >
                        <span class="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-1 text-xs font-medium text-success">
                          <Icon path={mdiCheck} class="size-3.5" />
                          Ticket gesendet
                        </span>
                      </Show>
                      <Show
                        when={row.checkedInAt !== null}
                        fallback={
                          <Button
                            type="button"
                            variant="contrast"
                            class="h-9 px-3 text-sm"
                            onClick={() => checkIn(row)}
                          >
                            Einchecken
                          </Button>
                        }
                      >
                        <span class="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-1 text-xs font-medium text-content">
                          Eingecheckt {row.checkedInAt ? dashDateFormat(row.checkedInAt, "zeit") : ""}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          class="h-9 px-3 text-sm"
                          aria-label={`Check-in von ${row.name} zurücknehmen`}
                          title="Check-in zurücknehmen"
                          onClick={() => checkInUndo(row)}
                        >
                          <Icon path={mdiUndo} class="size-4" />
                        </Button>
                      </Show>
                      <Show when={p.canEdit}>
                        <DropdownMenu
                          triggerIcon={mdiDotsVertical}
                          triggerAriaLabel={`Aktionen für ${row.name}`}
                          items={[
                            {
                              type: "item",
                              id: "loeschen",
                              label: "Löschen",
                              tone: "danger",
                              onSelect: () => p.state.confirmDelete.set(row.id),
                            },
                          ]}
                        />
                      </Show>
                    </div>
                  </li>
                )
              }}
            </For>
          </ul>
        </Show>
      </div>
      <ConfirmDialog
        open={confirmRow() !== null}
        onOpenChange={(open) => {
          if (!open) p.state.confirmDelete.set(null)
        }}
        title={`„${confirmRow()?.name ?? "Gast"}“ entfernen?`}
        description="Der Gast wird von der Liste entfernt, seine Gästeliste-Tickets werden storniert."
        confirmLabel="Löschen"
        tone="danger"
        onConfirm={() => {
          const row = confirmRow()
          if (row) remove(row)
        }}
      />
    </DashSection>
  )
}
