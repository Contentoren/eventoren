import { Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import type { AdminEventOverviewPanelProps } from "./AdminEventOverviewPanelProps.ts"
import { adminEventOverviewPanelStateCreate } from "./adminEventOverviewPanelStateCreate.ts"

export function AdminEventOverviewPanel(props: AdminEventOverviewPanelProps) {
  const state = adminEventOverviewPanelStateCreate()

  return (
    <section
      id={props.id}
      aria-label={`Übersicht für ${props.eventTitle}`}
      class="min-w-0 border-t border-border-subtle bg-surface-muted/40 p-4 text-sm dark:bg-slate-800/40"
      onClick={state.stopInteraction}
      onKeyDown={state.stopInteraction}
      onKeyUp={state.stopInteraction}
    >
      <div aria-busy={props.loading} aria-live="polite" aria-atomic="true">
        <Show when={props.errorMessage}>
          <p role="alert" class="text-danger">
            Übersicht konnte nicht geladen werden. Bitte Seite neu laden.
          </p>
        </Show>
        <Show when={!props.errorMessage}>
          <Show
            when={!props.loading && props.summary}
            fallback={
              <p role="status" class="text-content-muted">
                Übersicht wird vollständig geladen …
              </p>
            }
          >
            {(summary) => (
              <>
                <dl class="flex flex-wrap gap-x-8 gap-y-3">
                  <div>
                    <dt class="text-xs text-content-muted">Verkaufte Tickets</dt>
                    <dd class="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span class="text-lg font-semibold tabular-nums text-content">
                        {summary().paidValidTicketCount}
                      </span>
                      <Show when={summary().capacity != null}>
                        <span class="text-xs text-content-muted">
                          Kapazität: <span class="tabular-nums">{summary().capacity}</span>
                        </span>
                      </Show>
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs text-content-muted">Zahlung ausstehend</dt>
                    <dd class="mt-1 text-lg font-semibold tabular-nums text-content">
                      {summary().pendingPaymentTicketCount}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs text-content-muted">Käufer:innen</dt>
                    <dd class="mt-1 text-lg font-semibold tabular-nums text-content">{summary().distinctBuyerCount}</dd>
                  </div>
                </dl>
                <p class="mt-1 text-xs text-content-muted">
                  Verkauft: nur bezahlte, weiterhin gültige Tickets; ausstehend: gültige Tickets mit offener Zahlung;
                  eindeutige Käufer:innen.
                </p>
              </>
            )}
          </Show>
        </Show>
      </div>
      <fieldset class="mt-3 flex flex-wrap gap-2" aria-label="Event-Aktionen">
        <Button variant="outline" size="sm" class="min-h-11" onClick={props.onBookings}>
          Buchungen ansehen
        </Button>
        <Button variant="outline" size="sm" class="min-h-11" onClick={props.onEdit}>
          {props.archived ? "Ansehen" : "Bearbeiten"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="min-h-11"
          onClick={props.onDuplicate}
          disabled={props.duplicatePending || props.archivePending}
          aria-busy={props.duplicatePending}
        >
          {props.duplicatePending ? "Wird dupliziert …" : "Duplizieren"}
        </Button>
        <Show when={!props.archived}>
          <Button
            variant="outline"
            size="sm"
            class="min-h-11"
            onClick={props.onArchive}
            disabled={props.duplicatePending || props.archivePending}
            aria-busy={props.archivePending}
          >
            {props.archivePending ? "Wird archiviert …" : "Archivieren"}
          </Button>
        </Show>
      </fieldset>
      <Show when={props.duplicatePending || props.archivePending}>
        <p role="status" class="mt-2 text-xs text-content-muted">
          {props.archivePending ? "Event wird archiviert …" : "Event wird als Entwurf dupliziert …"}
        </p>
      </Show>
      <Show when={props.actionErrorMessage}>
        <p role="alert" class="mt-2 text-sm text-danger">
          {props.actionErrorMessage}
        </p>
      </Show>
    </section>
  )
}
