import { mdiPrinterOutline } from "@adaptive-ds/mdi/mdiPrinterOutline.js"
import { Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import { DashExportMenu } from "../../../ui/export/DashExportMenu.tsx"
import { DashLockedState } from "../../../ui/locked/DashLockedState.tsx"
import { dashAttendeesStateCreate } from "../DashAttendeesStateCreate.ts"
import type { DashAttendeeSearch } from "../model/dashAttendeeSearchParse.ts"
import { DashAttendeesList } from "./DashAttendeesList.tsx"
import { DashAttendeesPrintTable } from "./DashAttendeesPrintTable.tsx"
import { DashAttendeesToolbar } from "./DashAttendeesToolbar.tsx"

export interface DashAttendeesPageProps {
  eventId: string
  search: () => DashAttendeeSearch
  onPatch: (patch: Partial<DashAttendeeSearch>) => void
}

/** Teilnehmerseite je Event: eine Zeile je Ticket, Suche, Filter, Check-in-Aktionen, Exporte und Druck. */
export function DashAttendeesPage(p: DashAttendeesPageProps) {
  const state = dashAttendeesStateCreate({ eventId: () => p.eventId, search: p.search, onPatch: p.onPatch })

  const exportLabel = () => `Teilnehmerliste · Gefiltert (${state.result().rows.length} von ${state.result().total})`

  return (
    <Show
      when={state.canSee()}
      fallback={
        <DashLockedState description="Teilnehmer sehen nur Rollen mit Zugriff auf Bestellungen oder Einlass." />
      }
    >
      <DashAttendeesPrintTable
        eventTitle={state.event()?.title ?? "Event"}
        eventDate={state.event()?.startsAt ?? new Date().toISOString()}
        rows={state.result().rows}
      />
      <div class="flex flex-col gap-4 print:hidden">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <DashAttendeesToolbar
              q={state.qDraft.get()}
              onQ={state.applyQ}
              checkin={p.search().checkin}
              onCheckin={state.applyCheckin}
              counts={state.result().counts}
              kanal={p.search().kanal}
              onKanal={state.applyKanal}
              ticketTypes={state.ticketTypes()}
              ticketart={p.search().ticketart}
              onTicketart={state.applyTicketart}
            />
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <Button type="button" variant={buttonVariant.outline} class="h-9 px-3 text-sm" onClick={state.print}>
              <Icon path={mdiPrinterOutline} class="size-4" />
              Drucken
            </Button>
            <DashExportMenu
              groups={[
                {
                  id: "teilnehmer",
                  label: exportLabel(),
                  count: state.result().rows.length,
                  formats: ["csv", "xlsx", "pdf"],
                },
                {
                  id: "bestellungen",
                  label: `Bestellungen · Alle (${state.exports().orderRows.length})`,
                  count: state.exports().orderRows.length,
                  formats: ["csv", "xlsx"],
                },
                {
                  id: "checkins",
                  label: `Check-ins · Alle (${state.exports().scanRows.length})`,
                  count: state.exports().scanRows.length,
                  formats: ["csv"],
                },
              ]}
              onExport={(groupId, format) => {
                void state.exportRun(groupId, format)
              }}
            />
          </div>
        </div>
        <p class="text-sm text-content-muted" aria-live="polite">
          {state.result().rows.length} {state.result().rows.length === 1 ? "Teilnehmer" : "Teilnehmer"} ·{" "}
          {state.result().counts.eingecheckt} eingecheckt
        </p>
        <DashAttendeesList
          eventId={p.eventId}
          rows={state.result().rows}
          visibleCount={state.visibleCount.get()}
          canSeeOrders={state.canSeeOrders()}
          canCheckIn={state.canCheckIn()}
          empty={() => (state.result().total === 0 ? "Noch keine Teilnehmer." : "Keine Treffer für diesen Filter.")}
          onResetFilter={state.resetFilter}
          onCheckIn={state.checkIn}
          onCheckInUndo={state.checkInUndo}
          onMore={() => state.visibleCount.set(state.visibleCount.get() + 50)}
        />
        <p class="text-xs text-content-muted">
          Stand {dashDateFormat(new Date().toISOString(), "kurz")} · Zeiten in Europe/Berlin.
        </p>
      </div>
    </Show>
  )
}
