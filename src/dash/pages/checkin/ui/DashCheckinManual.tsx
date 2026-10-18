import { Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import { dashCheckinManualStateCreate } from "./dashCheckinManualStateCreate.ts"

/** Karte „Manuell einchecken": Ticketcode prüfen mit großem Inline-Ergebnis. */
export function DashCheckinManual(p: { eventId: string }) {
  const state = dashCheckinManualStateCreate({ eventId: () => p.eventId })

  return (
    <DashSection title="Manuell einchecken" description="Ticketcode am Haupteingang prüfen und einchecken.">
      <div class="flex flex-col gap-3">
        <form
          class="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault()
            state.check()
          }}
        >
          <DashField label="Ticketcode" for="dash-checkin-code" class="min-w-0 flex-1">
            <Input
              id="dash-checkin-code"
              value={state.code.get()}
              onInput={(event) => state.code.set(event.currentTarget.value)}
              placeholder="z. B. T-AB12-CD34"
              autocomplete="off"
              spellcheck={false}
              class="h-9 font-mono text-sm uppercase"
            />
          </DashField>
          <Button type="submit" variant="contrast" class="h-9 px-3 text-sm">
            Prüfen
          </Button>
        </form>
        <Show when={state.result.get()}>
          {(result) => (
            <p
              aria-live="polite"
              role={result().ok ? "status" : "alert"}
              class={
                result().ok
                  ? "rounded-control bg-success-soft px-3 py-2.5 text-sm font-medium text-success"
                  : "rounded-control bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger"
              }
            >
              {result().headline}
              <Show when={result().detail}>
                {(detail) => <span class="block font-normal opacity-90">{detail()}</span>}
              </Show>
            </p>
          )}
        </Show>
      </div>
    </DashSection>
  )
}
