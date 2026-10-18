import { mdiLogin } from "@adaptive-ds/mdi/mdiLogin.js"
import { mdiTicketConfirmationOutline } from "@adaptive-ds/mdi/mdiTicketConfirmationOutline.js"
import { mdiUndoVariant } from "@adaptive-ds/mdi/mdiUndoVariant.js"
import { Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIconOnly } from "#ui/interactive/button/ButtonIconOnly.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { LinkTextInternal } from "#ui/interactive/link/LinkText.jsx"
import { DataTable } from "#ui/table/data/DataTable.jsx"
import type { DataTableColumn } from "#ui/table/data/DataTableColumn.js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import { DashStatusPill } from "../../../ui/status/DashStatusPill.tsx"
import type { DashAttendeeListRow } from "../model/dashAttendeeListFilter.ts"

export interface DashAttendeesListProps {
  eventId: string
  rows: DashAttendeeListRow[]
  visibleCount: number
  canSeeOrders: boolean
  canCheckIn: boolean
  empty: () => string
  onResetFilter: () => void
  onCheckIn: (ticketId: string, holderName: string) => void
  onCheckInUndo: (ticketId: string, holderName: string) => void
  onMore: () => void
}

function ticketStatus(ticket: DashAttendeeListRow["ticket"]): string {
  if (ticket.status === "storniert") return "storniert"
  if (ticket.checkedInAt !== null) return "eingecheckt"
  return "gueltig"
}

function checkinLabel(row: DashAttendeeListRow): string {
  if (row.ticket.checkedInAt === null) return "—"
  const time = dashDateFormat(row.ticket.checkedInAt, "zeit")
  return row.ticket.entrance ? `${time} · ${row.ticket.entrance}` : time
}

/** Teilnehmertabelle mit Check-in-Spalte, Status-Pill und manuellen Einlass-Aktionen. */
export function DashAttendeesList(p: DashAttendeesListProps) {
  const columns = (): DataTableColumn<DashAttendeeListRow>[] => [
    {
      id: "name",
      header: "Name",
      cell: (row) => (
        <span class="flex min-w-0 flex-col">
          <span class="truncate font-medium">{row.ticket.holderName}</span>
          <span class="truncate text-xs text-content-muted">{row.ticket.holderEmail}</span>
        </span>
      ),
      sortValue: (row) => row.ticket.holderName,
    },
    {
      id: "ticketart",
      header: "Ticketart",
      cell: (row) => <span class="truncate">{row.ticketTypeName}</span>,
      sortValue: (row) => row.ticketTypeName,
      hideBelow: "lg",
    },
    {
      id: "code",
      header: "Code",
      cell: (row) => <span class="whitespace-nowrap font-mono text-xs">{row.ticket.code}</span>,
      sortValue: (row) => row.ticket.code,
      hideBelow: "sm",
      headerClass: "px-2",
      cellClass: "px-2",
    },
    {
      id: "bestellung",
      header: "Bestellung",
      cell: (row) => (
        <Show when={row.order} fallback={<span class="text-content-muted">—</span>}>
          <Show
            when={p.canSeeOrders}
            fallback={<span class="whitespace-nowrap font-mono text-xs">{row.order?.number}</span>}
          >
            <LinkTextInternal
              to={`/demo/dashboard/events/${p.eventId}/bestellungen?bestellung=${row.order?.id}` as never}
              onClick={(event) => event.stopPropagation()}
              class="whitespace-nowrap font-mono text-xs text-content hover:text-brand hover:underline"
            >
              {row.order?.number}
            </LinkTextInternal>
          </Show>
        </Show>
      ),
      sortValue: (row) => row.order?.number ?? "",
      hideBelow: "xl",
      headerClass: "px-2",
      cellClass: "px-2",
    },
    {
      id: "checkin",
      header: "Check-in",
      cell: (row) => (
        <Show when={row.ticket.checkedInAt !== null} fallback={<span class="text-content-muted">—</span>}>
          <span class="whitespace-nowrap tabular-nums">
            {dashDateFormat(row.ticket.checkedInAt as string, "zeit")}
            <Show when={row.ticket.entrance}>
              <span class="text-content-muted"> · {row.ticket.entrance}</span>
            </Show>
          </span>
        </Show>
      ),
      sortValue: (row) => row.ticket.checkedInAt ?? "",
      hideBelow: "sm",
      headerClass: "px-2",
      cellClass: "px-2",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <DashStatusPill kind="ticket" value={ticketStatus(row.ticket)} />,
      headerClass: "px-2",
      cellClass: "px-2",
    },
    {
      id: "aktion",
      header: "Aktion",
      align: "right",
      width: "w-12",
      headerClass: "px-2",
      cellClass: "px-2",
      cell: (row) => (
        <Show
          when={p.canCheckIn && row.ticket.status !== "storniert"}
          fallback={<span class="text-xs text-content-muted">—</span>}
        >
          <Show
            when={row.ticket.checkedInAt === null}
            fallback={
              <ButtonIconOnly
                type="button"
                variant={buttonVariant.outline}
                icon={mdiUndoVariant}
                title="Check-in zurücknehmen"
                aria-label={`Check-in von ${row.ticket.holderName} zurücknehmen`}
                onClick={(event) => {
                  event.stopPropagation()
                  p.onCheckInUndo(row.ticket.id, row.ticket.holderName)
                }}
              />
            }
          >
            <ButtonIconOnly
              type="button"
              variant={buttonVariant.contrast}
              icon={mdiLogin}
              title="Einchecken"
              aria-label={`${row.ticket.holderName} einchecken`}
              onClick={(event) => {
                event.stopPropagation()
                p.onCheckIn(row.ticket.id, row.ticket.holderName)
              }}
            />
          </Show>
        </Show>
      ),
    },
  ]

  const visibleRows = () => p.rows.slice(0, p.visibleCount)

  return (
    <DataTable
      rows={visibleRows()}
      rowKey={(row) => row.ticket.id}
      columns={columns()}
      ariaLabel="Teilnehmer"
      mobileCard={(row) => (
        <div class="flex flex-col gap-1.5 text-sm">
          <div class="flex items-center justify-between gap-2">
            <span class="truncate font-medium">{row.ticket.holderName}</span>
            <DashStatusPill kind="ticket" value={ticketStatus(row.ticket)} />
          </div>
          <div class="truncate text-xs text-content-muted">{row.ticket.holderEmail}</div>
          <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-content-muted">
            <span>{row.ticketTypeName}</span>
            <span class="font-mono">{row.ticket.code}</span>
            <span>{checkinLabel(row)}</span>
          </div>
          <Show when={p.canCheckIn && row.ticket.status !== "storniert"}>
            <div class="pt-1">
              <Show
                when={row.ticket.checkedInAt === null}
                fallback={
                  <Button
                    type="button"
                    variant={buttonVariant.outline}
                    class="h-9 px-3 text-sm"
                    onClick={() => p.onCheckInUndo(row.ticket.id, row.ticket.holderName)}
                  >
                    <Icon path={mdiUndoVariant} class="size-4" />
                    Zurücknehmen
                  </Button>
                }
              >
                <Button
                  type="button"
                  variant={buttonVariant.contrast}
                  class="h-9 px-3 text-sm"
                  onClick={() => p.onCheckIn(row.ticket.id, row.ticket.holderName)}
                >
                  Einchecken
                </Button>
              </Show>
            </div>
          </Show>
        </div>
      )}
      empty={
        <span class="inline-flex flex-col items-center gap-2">
          <Icon path={mdiTicketConfirmationOutline} class="size-7 text-content-muted" />
          <span>{p.empty()}</span>
          <Button variant={buttonVariant.link} class="h-auto px-0 text-sm" onClick={p.onResetFilter}>
            Filter zurücksetzen
          </Button>
        </span>
      }
      footer={
        p.rows.length > p.visibleCount ? (
          <div class="flex items-center justify-between gap-2 text-sm text-content-muted">
            <span>
              {Math.min(p.visibleCount, p.rows.length)} von {p.rows.length}
            </span>
            <Button variant={buttonVariant.link} class="h-auto px-0 text-sm" onClick={p.onMore}>
              Mehr laden
            </Button>
          </div>
        ) : undefined
      }
    />
  )
}
