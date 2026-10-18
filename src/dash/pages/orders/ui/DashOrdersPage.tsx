import { Show, createEffect, createSignal, on } from "solid-js"
import { dashStateGet } from "../../../store/dashStateGet.ts"
import { dashActiveOrg } from "../../../store/dashActiveOrg.ts"
import { dashCan } from "../../../store/dashCan.ts"
import { dashEventById } from "../../../store/dashEventById.ts"
import { dashOrgEvents } from "../../../store/dashOrgEvents.ts"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import { dashTableExport, type DashTableExportFormat } from "../../../export/dashTableExport.ts"
import { DashExportMenu } from "../../../ui/export/DashExportMenu.tsx"
import { DashLockedState } from "../../../ui/locked/DashLockedState.tsx"
import {
  dashOrderListFilter,
  type DashOrdersChannelFilter,
  type DashOrdersStatusFilter,
  type DashOrderListRow,
} from "../model/dashOrderListFilter.ts"
import { DashOrdersList } from "./DashOrdersList.tsx"
import { DashOrdersToolbar } from "./DashOrdersToolbar.tsx"

export interface DashOrdersSearch {
  q: string
  status: DashOrdersStatusFilter
  kanal: DashOrdersChannelFilter
  event: string | null
  bestellung: string | undefined
}

export interface DashOrdersPageProps {
  eventId: string | null
  search: () => DashOrdersSearch
  onPatch: (patch: Partial<DashOrdersSearch>) => void
}

function searchParse(raw: string | null): DashOrdersStatusFilter {
  if (raw === "bezahlt" || raw === "offen" || raw === "storniert" || raw === "erstattet") return raw
  return "alle"
}

function kanalParse(raw: string | null): DashOrdersChannelFilter {
  if (raw === "online" || raw === "abendkasse" || raw === "gaesteliste") return raw
  return "alle"
}

export function dashOrdersSearchParse(raw: Record<string, unknown>): DashOrdersSearch {
  const q = typeof raw["q"] === "string" ? raw["q"] : ""
  const status = searchParse(typeof raw["status"] === "string" ? raw["status"] : null)
  const kanal = kanalParse(typeof raw["kanal"] === "string" ? raw["kanal"] : null)
  const eventRaw = typeof raw["event"] === "string" ? raw["event"] : null
  const bestellung = typeof raw["bestellung"] === "string" ? raw["bestellung"] : undefined
  return { q, status, kanal, event: eventRaw && eventRaw !== "" ? eventRaw : null, bestellung }
}

/** Geteilte Bestellseite: Org-Liste mit Event-Filter oder Event-Liste ohne. */
export function DashOrdersPage(p: DashOrdersPageProps) {
  const org = () => dashActiveOrg()
  const canSee = () => dashCan("bestellungen.sehen")
  const state = () => dashStateGet()
  const scopeEvent = () => (p.eventId ? dashEventById(p.eventId) : null)

  const [qDraft, setQDraft] = createSignal(p.search().q)
  const [visibleCount, setVisibleCount] = createSignal(50)

  createEffect(
    on(
      () => p.search().q,
      (q) => setQDraft(q),
    ),
  )

  let qTimer: ReturnType<typeof setTimeout> | null = null
  const applyQ = (value: string) => {
    setQDraft(value)
    if (qTimer) clearTimeout(qTimer)
    qTimer = setTimeout(() => p.onPatch({ q: value === "" ? "" : value }), 250)
  }

  const events = () => {
    const active = org()
    if (!active) return []
    return dashOrgEvents(active.id).sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt))
  }

  const orders = () => {
    const active = org()
    if (!active) return []
    return state().orders.filter((order) => (p.eventId ? order.eventId === p.eventId : order.orgId === active.id))
  }

  const result = () =>
    dashOrderListFilter({
      orders: orders(),
      events: events(),
      q: p.search().q,
      status: p.search().status,
      kanal: p.search().kanal,
      scopeEventId: p.eventId,
      eventId: p.search().event,
    })

  const activeOrder = () => {
    const id = p.search().bestellung
    if (!id) return null
    return orders().find((order) => order.id === id) ?? null
  }

  const activeEventTitle = () => {
    const order = activeOrder()
    if (!order) return ""
    if (scopeEvent()) return scopeEvent()?.title ?? ""
    return events().find((event) => event.id === order.eventId)?.title ?? ""
  }

  const activeTickets = () => {
    const order = activeOrder()
    if (!order) return []
    return state().tickets.filter((ticket) => ticket.orderId === order.id)
  }

  const ticketTypeName = (ticketTypeId: string): string | null =>
    state().ticketTypes.find((type) => type.id === ticketTypeId)?.name ?? null

  const selectRow = (row: DashOrderListRow) => {
    p.onPatch({ bestellung: row.order.id })
  }

  const sheetOpenChange = (open: boolean) => {
    if (!open) p.onPatch({ bestellung: undefined })
  }

  const resetFilter = () => {
    setQDraft("")
    setVisibleCount(50)
    p.onPatch({ q: "", status: "alle", kanal: "alle", event: null })
  }

  const applyStatus = (status: DashOrdersStatusFilter) => {
    setVisibleCount(50)
    p.onPatch({ status })
  }

  const applyKanal = (kanal: DashOrdersChannelFilter) => {
    setVisibleCount(50)
    p.onPatch({ kanal })
  }

  const applyEvent = (eventId: string | null) => {
    setVisibleCount(50)
    p.onPatch({ event: eventId })
  }

  const exportRun = (format: DashTableExportFormat) => {
    const rows = result().exportRows.map((row) => [
      String(row[0] ?? ""),
      String(row[1] ?? ""),
      String(row[2] ?? ""),
      String(row[3] ?? ""),
      String(row[4] ?? ""),
      row[5] ?? 0,
      row[6] ?? 0,
      String(row[7] ?? ""),
      String(row[8] ?? ""),
    ])
    const orgName = org()?.name ?? "Export"
    return dashTableExport({
      format,
      fileParts: ["Bestellungen", orgName],
      title: p.eventId ? `Bestellungen · ${scopeEvent()?.title ?? ""}` : `Bestellungen · ${orgName}`,
      subtitle: `Gefiltert (${result().rows.length}) · Stand ${dashDateFormat(new Date().toISOString(), "kurz")}`,
      columns: [
        { header: "Nummer" },
        { header: "Datum" },
        { header: "Käufer" },
        { header: "E-Mail" },
        { header: "Event" },
        { header: "Tickets", align: "right" },
        { header: "Betrag", align: "right" },
        { header: "Zahlart" },
        { header: "Status" },
      ],
      rows,
      orientation: "landscape",
      now: new Date(),
    })
  }

  return (
    <Show
      when={canSee()}
      fallback={<DashLockedState description="Bestellungen sehen nur Rollen mit Zugriff auf Bestellungen." />}
    >
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <DashOrdersToolbar
              q={qDraft()}
              onQ={applyQ}
              status={p.search().status}
              onStatus={applyStatus}
              counts={result().counts}
              kanal={p.search().kanal}
              onKanal={applyKanal}
              showEventFilter={p.eventId === null}
              events={events()}
              eventId={p.search().event}
              onEvent={applyEvent}
            />
          </div>
          <DashExportMenu
            groups={[
              {
                id: "bestellungen",
                label: "Bestellungen",
                count: result().rows.length,
                formats: ["csv", "xlsx", "pdf"],
              },
            ]}
            onExport={(_groupId, format) => {
              void exportRun(format).then(() => undefined)
            }}
          />
        </div>
        <DashOrdersList
          rows={result().rows}
          visibleCount={visibleCount()}
          showEvent={p.eventId === null}
          activeOrder={activeOrder()}
          activeEventTitle={activeEventTitle()}
          activeTickets={activeTickets()}
          ticketTypeName={ticketTypeName}
          onSelect={selectRow}
          onSheetOpenChange={sheetOpenChange}
          empty={() => (orders().length === 0 ? "Noch keine Bestellungen." : "Keine Treffer für diesen Filter.")}
          onResetFilter={resetFilter}
          footer={() =>
            result().rows.length > 50
              ? {
                  shown: Math.min(visibleCount(), result().rows.length),
                  total: result().rows.length,
                  onMore: () => setVisibleCount(visibleCount() + 50),
                }
              : null
          }
        />
      </div>
    </Show>
  )
}
