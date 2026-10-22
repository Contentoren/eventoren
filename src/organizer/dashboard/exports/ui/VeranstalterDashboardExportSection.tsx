import { Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { veranstalterDashboardExportStateCreate } from "../veranstalterDashboardExportStateCreate.ts"

/** Permission-filtered export section: CSV, XLSX, PDF and ICS for the visible page window. */
export function VeranstalterDashboardExportSection(p: {
  state: ReturnType<typeof veranstalterDashboardExportStateCreate>
}) {
  const state = p.state
  return (
    <Show
      when={state.canReadKind("teilnehmer") || state.canReadKind("checkins")}
      fallback={<p class="text-sm text-content-muted">Keine Berechtigung für Exporte.</p>}
    >
      <section aria-label="Exporte" class="flex flex-col gap-2 rounded-card border border-border-subtle bg-surface p-3">
        <h2 class="text-sm font-semibold text-content">Exporte</h2>
        <div class="flex flex-wrap gap-2">
          <Show when={state.canReadKind("teilnehmer")}>
            <Button type="button" variant="outline" onClick={() => state.selectKind("teilnehmer")}>
              Teilnehmer
            </Button>
            <Button type="button" variant="outline" onClick={() => state.selectKind("bestellungen")}>
              Bestellungen
            </Button>
          </Show>
          <Show when={state.canReadKind("checkins")}>
            <Button type="button" variant="outline" onClick={() => state.selectKind("checkins")}>
              Check-ins
            </Button>
          </Show>
        </div>
        <p class="text-xs text-content-muted">
          Auswahl: {state.kind.get()} · {state.rows().length} Zeilen in diesem Fenster · Zeiten in Europe/Berlin.
        </p>
        <Show when={state.error()}>
          {(message) => (
            <p role="alert" class="text-sm">
              {message()}
            </p>
          )}
        </Show>
        <div class="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={state.downloadCsv}>
            CSV
          </Button>
          <Button type="button" variant="outline" onClick={state.downloadXlsx}>
            XLSX
          </Button>
          <Button type="button" variant="outline" onClick={() => void state.downloadPdf()}>
            PDF
          </Button>
          <Button type="button" variant="outline" onClick={state.downloadIcs}>
            ICS
          </Button>
        </div>
        <Show when={state.message.get()}>
          <p role="status" class="text-xs text-content-muted">
            {state.message.get()}
          </p>
        </Show>
        <nav aria-label="Exportfenster" class="flex gap-2">
          <Show when={state.previousAvailable()}>
            <Button type="button" variant="outline" onClick={state.back}>
              Zurück
            </Button>
          </Show>
          <Show when={!state.isDone()}>
            <Button type="button" variant="outline" onClick={state.next}>
              Nächstes Fenster
            </Button>
          </Show>
          <Show when={state.previousAvailable() || !state.isDone()}>
            <Button type="button" variant="outline" onClick={state.first}>
              Erstes Fenster
            </Button>
          </Show>
        </nav>
      </section>
    </Show>
  )
}
