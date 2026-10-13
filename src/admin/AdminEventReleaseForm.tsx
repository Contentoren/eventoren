import { Show } from "solid-js"
import { InputDateTime } from "#ui/input/datetime/InputDateTime.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import type { AdminCatalogPageState } from "./AdminCatalogPageState.ts"
import { AdminEventFeedback } from "./AdminEventFeedback.tsx"
import { adminEventReleaseFormStateCreate } from "./adminEventReleaseFormStateCreate.ts"

export function AdminEventReleaseForm(props: { state: AdminCatalogPageState }) {
  const state = adminEventReleaseFormStateCreate({ catalog: () => props.state })
  return (
    <CardWrapper class="p-5 sm:p-6">
      <form class="flex flex-col gap-5" onSubmit={state.submit} onInput={state.input} onChange={state.input}>
        <header>
          <h2 class="text-lg font-semibold text-content">Buchungsstart planen</h2>
          <p class="mt-2 text-sm leading-relaxed text-content-muted">
            Vor dem Buchungsstart sehen Besucher Titel, Eventbild und Countdown. Zur eingestellten Uhrzeit öffnet sich
            die Buchung automatisch.
          </p>
        </header>
        <div>
          <Label for="admin-event-booking-opens">Datum und Uhrzeit der Freigabe</Label>
          <InputDateTime
            id="admin-event-booking-opens"
            class="mt-2"
            value={state.value()}
            onInput={state.change}
            disabled={props.state.isSaving()}
          />
          <p class="mt-2 text-xs text-content-muted">
            Zeitzone: {state.timezone()}. Ohne Datum ist das Event sofort buchbar.
          </p>
        </div>
        <Show when={state.validation()}>
          <p role="alert" class="text-sm text-danger">
            {state.validation()}
          </p>
        </Show>
        <AdminEventFeedback state={props.state} />
        <div class="flex flex-wrap gap-3">
          <Button type="submit" disabled={props.state.isSaving()}>
            {props.state.isSaving() ? "Speichert …" : "Freigabe speichern"}
          </Button>
          <Button type="button" variant="outline" disabled={props.state.isSaving()} onClick={state.clear}>
            Zeitplanung entfernen
          </Button>
        </div>
        <p class="text-xs text-content-muted">
          Änderungen und das Entfernen der Zeitplanung werden erst mit „Freigabe speichern“ übernommen.
        </p>
      </form>
    </CardWrapper>
  )
}
