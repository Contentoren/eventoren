import { For, Show } from "solid-js"
import { InputDateTime } from "#ui/input/datetime/InputDateTime.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { SelectMultiple } from "#ui/input/select/SelectMultiple.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { ScannerLinkShareControls } from "./ScannerLinkShareControls.tsx"
import { scannerHelperManagementStateCreate } from "./scannerHelperManagementStateCreate.ts"
import { scannerLinkListHrefCreate } from "./scannerLinkListHrefCreate.ts"

export function ScannerHelperManagement(props: { readonly code: string }) {
  const state = scannerHelperManagementStateCreate(() => props.code)
  return (
    <section aria-label="Helferlinks" class="flex flex-col gap-space-4">
      <Show when={state.loading()}>
        <p role="status">Freigabelink wird geprüft …</p>
      </Show>
      <Show when={state.error()}>
        <p role="alert">
          {state.error()} <Button onClick={state.reload}>Erneut versuchen</Button>
        </p>
      </Show>
      <Show when={state.active()}>
        <CardWrapper class="flex flex-col gap-space-4">
          <h2 class="text-xl font-semibold">Helferlinks verwalten</h2>
          <p>Helfer können Tickets suchen und einchecken, aber keine Links verwalten.</p>
          <form
            class="flex flex-col gap-space-4"
            onSubmit={(event) => {
              event.preventDefault()
              void state.create()
            }}
          >
            <label class="flex flex-col gap-space-1">
              Name
              <Input
                required
                maxLength={120}
                value={state.name.get()}
                onInput={(event) => state.name.set(event.currentTarget.value)}
                disabled={state.pending()}
              />
            </label>
            <div class="flex flex-col gap-space-1">
              <span id="helper-event-label">Events (mindestens eines)</span>
              <SelectMultiple
                id="helper-events"
                valueSignal={state.selectedEvents}
                getOptions={() => state.context()?.events.map((event) => event.eventKey) ?? []}
                valueText={(key) => state.context()?.events.find((event) => event.eventKey === key)?.title ?? key}
                buttonProps={{ "aria-labelledby": "helper-event-label" }}
                textAddEntry="Event auswählen"
                disabled={state.pending()}
              />
            </div>
            <label class="flex flex-col gap-space-1">
              Ablaufdatum und Uhrzeit
              <InputDateTime
                required
                max={state.maxExpiry()}
                value={state.expiry.get()}
                onInput={(val) => state.expiry.set(val)}
                disabled={state.pending()}
              />
            </label>
            <p class="text-sm text-content-muted">
              Spätestens{" "}
              {new Date(state.context()?.expiresAt ?? 0).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })};
              maximal ein Jahr ab jetzt.
            </p>
            <Button type="submit" disabled={state.pending()}>
              {state.pending() ? "Bitte warten …" : "Helferlink erstellen"}
            </Button>
          </form>
        </CardWrapper>
        <Show when={state.actionError()}>
          <p role="alert" class="text-danger">
            {state.actionError()}
          </p>
        </Show>
        <h2 class="text-xl font-semibold">Erstellte Helferlinks</h2>
        <Show when={state.listing()}>
          <p role="status">Helferlinks werden geladen …</p>
        </Show>
        <Show when={!state.listing() && state.helpers().length === 0}>
          <p>Noch keine Helferlinks vorhanden.</p>
        </Show>
        <For each={state.helpers()}>
          {(helper) => (
            <CardWrapper class="flex flex-col gap-space-3">
              <h3 class="font-semibold">{helper.name}</h3>
              <p class="text-sm">
                Events:{" "}
                {helper.eventKeys
                  .map((key) => state.context()?.events.find((event) => event.eventKey === key)?.title ?? key)
                  .join(", ")}
              </p>
              <p class="text-sm">
                Ablauf: {new Date(helper.expiresAt).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}
              </p>
              <Show
                when={helper.revokedAt || helper.expiresAt <= Date.now()}
                fallback={
                  <>
                    <ScannerLinkShareControls href={scannerLinkListHrefCreate(helper.code)} name={helper.name} />
                    <Button disabled={state.pending()} onClick={() => void state.revoke(helper)}>
                      Widerrufen
                    </Button>
                  </>
                }
              >
                <p class="text-content-muted">{helper.revokedAt ? "Widerrufen" : "Abgelaufen"}</p>
              </Show>
            </CardWrapper>
          )}
        </For>
        <Show when={state.hasMore()}>
          <Button disabled={state.listing()} onClick={state.loadMore}>
            Weitere Helferlinks laden
          </Button>
        </Show>
      </Show>
    </section>
  )
}
