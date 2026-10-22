import { Match, Show, Switch } from "solid-js"
import { InputDateTime } from "#ui/input/datetime/InputDateTime.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import type { VeranstalterDashboardEventCreateState } from "./veranstalterDashboardEventCreateStateCreate.ts"

const stepLabels = ["Grunddaten", "Tickets", "Prüfen"] as const

/** Three-step draft wizard: base → tickets → review. Publishing stays backend-gated. */
export function VeranstalterDashboardEventCreatePage(p: { readonly state: VeranstalterDashboardEventCreateState }) {
  const state = p.state
  return (
    <section aria-labelledby="veranstalter-event-neu" class="flex max-w-2xl flex-col gap-4">
      <header class="flex flex-col gap-1">
        <h1 id="veranstalter-event-neu" class="text-xl font-semibold tracking-tight text-content sm:text-2xl">
          Neue Veranstaltung
        </h1>
        <p class="text-sm text-content-muted">
          Schritt {state.step() + 1} von 3: {stepLabels[state.step()]}
        </p>
      </header>

      <Show when={state.failure()}>
        {(message) => (
          <p role="alert" class="rounded-card border border-border-subtle bg-surface px-3 py-2 text-sm text-content">
            {message()}
          </p>
        )}
      </Show>

      <Show
        when={!state.isLocked()}
        fallback={
          <div class="flex flex-col gap-2 rounded-card border border-border-subtle bg-surface p-3">
            <p class="text-sm font-medium text-content">Keine Bearbeitungsrechte</p>
            <p class="text-sm text-content-muted">
              Der Assistent ist schreibgeschützt: Ohne das Recht „Veranstaltungen bearbeiten“ lassen sich keine Entwürfe
              anlegen oder veröffentlichen. Bitte wende dich an deine Organisation.
            </p>
            <div>
              <Button variant="outline" size="sm" class="h-9 text-sm" onClick={state.cancel}>
                Zurück zur Übersicht
              </Button>
            </div>
          </div>
        }
      >
        <Show when={state.isResuming()}>
          <p
            class="rounded-card border border-border-subtle bg-surface px-3 py-2 text-sm text-content-muted"
            role="status"
          >
            Entwurf wird geladen …
          </p>
        </Show>
        <Show when={state.resumeError()}>
          {(message) => (
            <p role="alert" class="rounded-card border border-border-subtle bg-surface px-3 py-2 text-sm text-content">
              {message()}
            </p>
          )}
        </Show>

        <Switch>
          <Match when={state.step() === 0}>
            <form
              class="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault()
                void state.baseNext()
              }}
            >
              <label class="flex flex-col gap-1 text-sm">
                Titel
                <Input
                  value={state.base().title}
                  onInput={(event) => state.baseFieldChange("title", event.currentTarget.value)}
                  required
                />
              </label>
              <label class="flex flex-col gap-1 text-sm">
                Kategorie
                <Input
                  value={state.base().category}
                  onInput={(event) => state.baseFieldChange("category", event.currentTarget.value)}
                  required
                />
              </label>
              <label class="flex flex-col gap-1 text-sm">
                Beschreibung
                <Textarea
                  value={state.base().description}
                  onInput={(event) => state.baseFieldChange("description", event.currentTarget.value)}
                />
              </label>
              <label class="flex flex-col gap-1 text-sm">
                Beginn (Europe/Berlin)
                <InputDateTime
                  value={state.base().startsAtLocal}
                  onInput={(value) => state.baseFieldChange("startsAtLocal", value)}
                  required
                />
              </label>
              <label class="flex flex-col gap-1 text-sm">
                Ende (Europe/Berlin)
                <InputDateTime
                  value={state.base().endsAtLocal}
                  onInput={(value) => state.baseFieldChange("endsAtLocal", value)}
                  required
                />
              </label>
              <label class="flex flex-col gap-1 text-sm">
                Einlass (Europe/Berlin)
                <InputDateTime
                  value={state.base().doorsAtLocal}
                  onInput={(value) => state.baseFieldChange("doorsAtLocal", value)}
                  required
                />
              </label>
              <label class="flex flex-col gap-1 text-sm">
                Veranstaltungsort
                <Input
                  value={state.base().venue}
                  onInput={(event) => state.baseFieldChange("venue", event.currentTarget.value)}
                  required
                />
              </label>
              <label class="flex flex-col gap-1 text-sm">
                Stadt
                <Input
                  value={state.base().city}
                  onInput={(event) => state.baseFieldChange("city", event.currentTarget.value)}
                  required
                />
              </label>
              <label class="flex flex-col gap-1 text-sm">
                Adresse
                <Input
                  value={state.base().address}
                  onInput={(event) => state.baseFieldChange("address", event.currentTarget.value)}
                />
              </label>
              <label class="flex flex-col gap-1 text-sm">
                Bild-URL
                <Input
                  type="url"
                  value={state.base().imageUrl}
                  onInput={(event) => state.baseFieldChange("imageUrl", event.currentTarget.value)}
                />
              </label>
              <label class="flex flex-col gap-1 text-sm">
                Bildbeschreibung
                <Input
                  value={state.base().imageAlt}
                  onInput={(event) => state.baseFieldChange("imageAlt", event.currentTarget.value)}
                />
              </label>
              <div class="flex gap-2">
                <Button variant="outline" size="sm" class="h-9 text-sm" onClick={state.cancel}>
                  Abbrechen
                </Button>
                <Button type="submit" variant="filled" size="sm" class="h-9 text-sm" disabled={state.pending()}>
                  {state.pending() ? "Speichert …" : "Weiter zu Tickets"}
                </Button>
              </div>
            </form>
          </Match>

          <Match when={state.step() === 1}>
            <form
              class="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault()
                void state.tierSave()
              }}
            >
              <p class="text-sm text-content-muted">
                Lege mindestens einen Tarif an — erst dann lässt sich der Entwurf veröffentlichen.
              </p>
              <label class="flex flex-col gap-1 text-sm">
                Tarifname
                <Input
                  value={state.tier().name}
                  onInput={(event) => state.tierFieldChange("name", event.currentTarget.value)}
                  required
                />
              </label>
              <label class="flex flex-col gap-1 text-sm">
                Preis in Euro
                <Input
                  inputMode="decimal"
                  value={state.tier().priceEuros}
                  onInput={(event) => state.tierFieldChange("priceEuros", event.currentTarget.value)}
                  required
                />
              </label>
              <label class="flex flex-col gap-1 text-sm">
                Kapazität
                <Input
                  inputMode="numeric"
                  value={state.tier().capacity}
                  onInput={(event) => state.tierFieldChange("capacity", event.currentTarget.value)}
                  required
                />
              </label>
              <div class="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" class="h-9 text-sm" onClick={state.stepBack}>
                  Zurück
                </Button>
                <Button variant="outline" size="sm" class="h-9 text-sm" onClick={state.tierSkip}>
                  Später
                </Button>
                <Button type="submit" variant="filled" size="sm" class="h-9 text-sm" disabled={state.pending()}>
                  {state.pending() ? "Speichert …" : "Tarif speichern"}
                </Button>
              </div>
            </form>
          </Match>

          <Match when={state.step() === 2}>
            <div class="flex flex-col gap-3">
              <dl class="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt class="text-xs text-content-muted">Titel</dt>
                  <dd class="font-medium text-content">{state.base().title}</dd>
                </div>
                <div>
                  <dt class="text-xs text-content-muted">Kategorie</dt>
                  <dd class="font-medium text-content">{state.base().category}</dd>
                </div>
                <div>
                  <dt class="text-xs text-content-muted">Ort</dt>
                  <dd class="font-medium text-content">
                    {state.base().venue}, {state.base().city}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-content-muted">Tarif</dt>
                  <dd class="font-medium tabular-nums text-content">
                    {state.tier().name ? `${state.tier().name} · ${state.tierPriceLabel()}` : "Noch kein Tarif"}
                  </dd>
                </div>
              </dl>
              <Show when={!state.orgActive()}>
                <p class="rounded-card border border-border-subtle bg-surface px-3 py-2 text-sm text-content-muted">
                  Die Organisation ist nicht aktiv — die Veröffentlichung bleibt gesperrt, bis sie aktiviert ist.
                </p>
              </Show>
              <div class="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" class="h-9 text-sm" onClick={state.stepBack}>
                  Zurück
                </Button>
                <Button
                  variant="filled"
                  size="sm"
                  class="h-9 text-sm"
                  onClick={() => void state.publish()}
                  disabled={state.pending()}
                >
                  {state.pending() ? "Veröffentlicht …" : "Veröffentlichen"}
                </Button>
              </div>
            </div>
          </Match>
        </Switch>
      </Show>
    </section>
  )
}
