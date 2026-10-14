import { For, Show } from "solid-js"
import { ScannerLinkShareControls } from "#src/organizer/ScannerLinkShareControls.tsx"
import { scannerLinkListHrefCreate } from "#src/organizer/scannerLinkListHrefCreate.ts"
import { UiContainer } from "#src/ui/UiContainer.tsx"
import { InputDateTime } from "#ui/input/datetime/InputDateTime.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { SelectMultiple } from "#ui/input/select/SelectMultiple.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Details } from "#ui/interactive/details/Details.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import type { AdminEventItem } from "./AdminEventItem.ts"
import { adminScannerLinksStateCreate } from "./adminScannerLinksStateCreate.ts"

export function AdminScannerLinksPage(props: {
  readonly eventsResult: () =>
    | { readonly success: true; readonly data: readonly AdminEventItem[] }
    | { readonly success: false; readonly errorMessage: string }
}) {
  const state = adminScannerLinksStateCreate(() => props.eventsResult())
  return (
    <main id="content" tabindex="-1">
      <UiContainer width="wide" class="flex flex-col gap-6 py-8">
        <h1 class="text-3xl font-semibold">Scanner-Freigabelinks</h1>
        <p>
          Links gewähren ohne Anmeldung Zugriff auf Tickets und Check-in der ausgewählten Events. Nur an
          vertrauenswürdige Personen weitergeben.
        </p>
        <Show when={!props.eventsResult().success}>
          <p role="alert">Eventliste konnte nicht geladen werden. Bitte Seite neu laden.</p>
        </Show>
        <Show when={state.error()}>
          <p role="alert">{state.error()}</p>
        </Show>
        <Details
          class="rounded-xl border-0 bg-surface shadow-md shadow-slate-900/10 dark:bg-slate-800 dark:shadow-black/25"
          summaryEl={<h2 class="text-xl font-semibold">Veranstalterlink erstellen</h2>}
          summaryClass="flex-row p-4 text-content lg:p-8 [&_h2]:text-xl [&_h2]:font-semibold"
        >
          <div class="flex flex-col gap-4 px-4 pb-4 lg:px-8 lg:pb-8">
            <form
              class="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault()
                void state.createOrganizer()
              }}
            >
              <label class="flex flex-col gap-1">
                Name
                <Input
                  class="min-h-11 rounded-lg border-0 bg-surface-muted/60 dark:bg-slate-800/60"
                  required
                  maxLength={120}
                  value={state.organizerName.get()}
                  onInput={(event) => state.organizerName.set(event.currentTarget.value)}
                  disabled={state.pending()}
                />
              </label>
              <div class="flex flex-col gap-1">
                <span id="admin-organizer-events-label">Events (1–50, nur veröffentlichte)</span>
                <SelectMultiple
                  id="admin-organizer-events"
                  class="min-h-11 border-0 bg-surface-muted/60 dark:bg-slate-800/60"
                  valueSignal={state.organizerEvents}
                  getOptions={() => state.publishedEvents().map((event) => event.id)}
                  valueText={(key) => state.publishedEvents().find((event) => event.id === key)?.title ?? key}
                  buttonProps={{ "aria-labelledby": "admin-organizer-events-label", class: "border-0" }}
                  noItemsClass="rounded-lg border-0 bg-surface-base/80 dark:bg-slate-700/60 dark:hover:bg-slate-700/60"
                  textAddEntry="Event auswählen"
                  disabled={state.pending()}
                />
              </div>
              <label class="flex flex-col gap-1">
                Ablaufdatum und Uhrzeit
                <InputDateTime
                  required
                  max={state.maxExpiry()}
                  value={state.organizerExpiry.get()}
                  onInput={(val) => state.organizerExpiry.set(val)}
                  disabled={state.pending()}
                />
              </label>
              <Button type="submit" disabled={state.pending() || !props.eventsResult().success}>
                Veranstalterlink erstellen
              </Button>
            </form>
          </div>
        </Details>
        <h2 class="text-xl font-semibold">Veranstalterlinks</h2>
        <Show when={state.loading()}>
          <p role="status">Links werden geladen …</p>
        </Show>
        <For
          each={state.organizers()}
          fallback={
            <Show when={!state.loading()}>
              <p>Noch keine Veranstalterlinks vorhanden.</p>
            </Show>
          }
        >
          {(link) => (
            <CardWrapper class="flex flex-col gap-3 rounded-xl border-0 shadow-md shadow-slate-900/10 dark:shadow-black/25 [&_input[readonly]]:border-0 [&_input[readonly]]:bg-surface-muted/60 dark:[&_input[readonly]]:bg-slate-800/60">
              <h3 class="font-semibold">{link.name}</h3>
              <p>
                Events:{" "}
                {link.eventKeys
                  .map((key) => state.publishedEvents().find((event) => event.id === key)?.title ?? key)
                  .join(", ")}
              </p>
              <p>Ablauf: {new Date(link.expiresAt).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}</p>
              <Show
                when={link.revokedAt || link.expiresAt <= Date.now()}
                fallback={<ScannerLinkShareControls href={scannerLinkListHrefCreate(link.code)} name={link.name} />}
              >
                <p>{link.revokedAt ? "Widerrufen" : "Abgelaufen"}</p>
              </Show>
              <Show when={!link.revokedAt}>
                <Button disabled={state.pending()} onClick={() => void state.revoke(link)}>
                  Widerrufen
                </Button>
              </Show>
              <Button
                variant="outline"
                class="min-h-11 rounded-lg border-0 bg-surface-muted/60 dark:bg-slate-800/60"
                onClick={() => state.selectParent(link._id)}
                aria-expanded={state.selectedParent() === link._id}
              >
                Helferlinks verwalten
              </Button>
            </CardWrapper>
          )}
        </For>
        <Show when={state.organizerHasMore()}>
          <Button disabled={state.loading()} onClick={state.loadMoreOrganizers}>
            Weitere Veranstalterlinks laden
          </Button>
        </Show>
        <Show when={state.parent()} keyed>
          {(parent) => (
            <section class="flex flex-col gap-4" aria-label={`Helferlinks für ${parent.name}`}>
              <h2 class="text-xl font-semibold">Helferlinks für {parent.name}</h2>
              <Show when={!parent.revokedAt && parent.expiresAt > Date.now()}>
                <CardWrapper class="rounded-xl border-0 shadow-md shadow-slate-900/10 dark:shadow-black/25">
                  <form
                    class="flex flex-col gap-4"
                    onSubmit={(event) => {
                      event.preventDefault()
                      void state.createHelper()
                    }}
                  >
                    <label class="flex flex-col gap-1">
                      Name
                      <Input
                        class="min-h-11 rounded-lg border-0 bg-surface-muted/60 dark:bg-slate-800/60"
                        required
                        maxLength={120}
                        value={state.helperName.get()}
                        onInput={(event) => state.helperName.set(event.currentTarget.value)}
                        disabled={state.pending()}
                      />
                    </label>
                    <div class="flex flex-col gap-1">
                      <span id="admin-helper-events-label">Events (aus dem Veranstalterlink)</span>
                      <SelectMultiple
                        id="admin-helper-events"
                        class="min-h-11 border-0 bg-surface-muted/60 dark:bg-slate-800/60"
                        valueSignal={state.helperEvents}
                        getOptions={() => state.availableEvents().map((event) => event.id)}
                        valueText={(key) => state.availableEvents().find((event) => event.id === key)?.title ?? key}
                        buttonProps={{ "aria-labelledby": "admin-helper-events-label", class: "border-0" }}
                        noItemsClass="rounded-lg border-0 bg-surface-base/80 dark:bg-slate-700/60 dark:hover:bg-slate-700/60"
                        textAddEntry="Event auswählen"
                        disabled={state.pending()}
                      />
                    </div>
                    <label class="flex flex-col gap-1">
                      Ablaufdatum und Uhrzeit
                      <InputDateTime
                        required
                        max={state.maxExpiry(parent.expiresAt)}
                        value={state.helperExpiry.get()}
                        onInput={(val) => state.helperExpiry.set(val)}
                        disabled={state.pending()}
                      />
                    </label>
                    <Button type="submit" disabled={state.pending() || state.helperLoading()}>
                      Helferlink erstellen
                    </Button>
                  </form>
                </CardWrapper>
              </Show>
              <For
                each={state.helpers()}
                fallback={
                  <Show when={!state.helperLoading()}>
                    <p>Noch keine Helferlinks vorhanden.</p>
                  </Show>
                }
              >
                {(helper) => (
                  <CardWrapper class="flex flex-col gap-3 rounded-xl border-0 shadow-md shadow-slate-900/10 dark:shadow-black/25 [&_input[readonly]]:border-0 [&_input[readonly]]:bg-surface-muted/60 dark:[&_input[readonly]]:bg-slate-800/60">
                    <h3 class="font-semibold">{helper.name}</h3>
                    <p>
                      Events:{" "}
                      {helper.eventKeys
                        .map((key) => state.publishedEvents().find((event) => event.id === key)?.title ?? key)
                        .join(", ")}
                    </p>
                    <p>Ablauf: {new Date(helper.expiresAt).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}</p>
                    <Show
                      when={
                        parent.revokedAt ||
                        parent.expiresAt <= Date.now() ||
                        helper.revokedAt ||
                        helper.expiresAt <= Date.now()
                      }
                      fallback={
                        <ScannerLinkShareControls href={scannerLinkListHrefCreate(helper.code)} name={helper.name} />
                      }
                    >
                      <p>{helper.revokedAt || parent.revokedAt ? "Widerrufen" : "Abgelaufen"}</p>
                    </Show>
                    <Show when={!helper.revokedAt}>
                      <Button disabled={state.pending()} onClick={() => void state.revoke(helper)}>
                        Widerrufen
                      </Button>
                    </Show>
                  </CardWrapper>
                )}
              </For>
              <Show when={state.helperHasMore()}>
                <Button disabled={state.helperLoading()} onClick={state.loadMoreHelpers}>
                  Weitere Helferlinks laden
                </Button>
              </Show>
            </section>
          )}
        </Show>
      </UiContainer>
    </main>
  )
}
