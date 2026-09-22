import { For, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { eventPriceFormat } from "../events/eventPriceFormat.ts"
import type { AdminCatalogPageState } from "./AdminCatalogPageState.ts"
import { adminTicketProductsFormStateCreate } from "./adminTicketProductsFormStateCreate.ts"

export function AdminTicketProductsForm(props: { state: AdminCatalogPageState }) {
  const state = adminTicketProductsFormStateCreate(props.state)

  return (
    <div class="grid items-start gap-5 lg:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1.4fr)]">
      <CardWrapper>
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-content">Ticketprodukte</h2>
          <Button type="button" variant="outline" onClick={state.newTier}>
            Neu
          </Button>
        </div>
        <Show
          when={(props.state.selectedEvent()?.tiers.length ?? 0) > 0}
          fallback={<p class="mt-4 text-sm text-content-muted">Noch keine Ticketprodukte vorhanden.</p>}
        >
          <ul class="mt-4 flex flex-col gap-2" aria-label="Vorhandene Ticketprodukte">
            <For each={props.state.selectedEvent()?.tiers ?? []}>
              {(tier) => (
                <li>
                  <button
                    type="button"
                    class={`w-full rounded-lg border p-3 text-left transition-colors ${props.state.tierDraft().tierKey === tier.id ? "border-brand bg-brand/10" : "border-border bg-surface hover:bg-surface-muted"}`}
                    aria-pressed={props.state.tierDraft().tierKey === tier.id}
                    onClick={() => state.selectTier(tier)}
                  >
                    <span class="block font-semibold text-content">{tier.name}</span>
                    <span class="mt-1 block text-sm text-content-muted">{eventPriceFormat(tier.priceCents)}</span>
                    <span class="mt-1 block text-xs text-content-muted">
                      {tier.available} verfügbar · {tier.capacity} gesamt
                    </span>
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </CardWrapper>

      <CardWrapper>
        <form class="flex flex-col gap-5" onSubmit={state.submit}>
          <div>
            <h2 class="text-lg font-semibold text-content">
              {props.state.tierDraft().tierKey ? "Ticketprodukt bearbeiten" : "Neues Ticketprodukt"}
            </h2>
            <p class="mt-1 text-sm text-content-muted">
              Reservierte und verkaufte Mengen bleiben beim Ändern der Gesamtkapazität geschützt.
            </p>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <Field
              id="admin-tier-name"
              label="Name"
              required
              value={props.state.tierDraft().name}
              onInput={(value) => props.state.tierFieldChange("name", value)}
            />
            <Field
              id="admin-tier-capacity"
              label="Gesamtkapazität"
              required
              type="number"
              min="0"
              step="1"
              value={props.state.tierDraft().capacity}
              onInput={(value) => props.state.tierFieldChange("capacity", value)}
            />
            <Field
              id="admin-tier-price"
              label="Preis in Euro"
              required
              inputmode="decimal"
              value={state.priceEuro.get()}
              onInput={state.priceEuro.set}
            />
            <Field
              id="admin-tier-fee"
              label="Gebühr in Euro"
              required
              inputmode="decimal"
              value={state.feeEuro.get()}
              onInput={state.feeEuro.set}
            />
          </div>
          <div>
            <Label for="admin-tier-description">Beschreibung</Label>
            <Textarea
              id="admin-tier-description"
              class="mt-2"
              value={props.state.tierDraft().description}
              onInput={(event) => props.state.tierFieldChange("description", event.currentTarget.value)}
            />
          </div>

          <details class="rounded-lg border border-border bg-surface-muted p-4 text-content">
            <summary class="cursor-pointer font-semibold">Erweitert</summary>
            <div class="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                id="admin-tier-key"
                label="Technischer Produkt-Key"
                required
                value={props.state.tierDraft().tierKey}
                onInput={(value) => props.state.tierFieldChange("tierKey", value)}
              />
              <Field
                id="admin-tier-sort"
                label="Sortierung"
                type="number"
                min="0"
                step="1"
                value={props.state.tierDraft().sortOrder}
                onInput={(value) => props.state.tierFieldChange("sortOrder", value)}
              />
            </div>
          </details>

          <Show when={state.validationMessage()}>
            <p role="alert" class="text-sm font-medium text-danger">
              {state.validationMessage()}
            </p>
          </Show>
          <div class="border-t border-border pt-5">
            <div class="flex flex-wrap gap-3">
              <Button type="submit" disabled={props.state.isSaving()}>
                {props.state.isSaving() ? "Speichert …" : "Ticketprodukt speichern"}
              </Button>
              <Show when={props.state.tierDraft().tierKey}>
                <Button
                  type="button"
                  variant="outline"
                  disabled={props.state.isSaving()}
                  onClick={props.state.deleteTier}
                >
                  Ticketprodukt löschen
                </Button>
              </Show>
            </div>
          </div>
        </form>
      </CardWrapper>
    </div>
  )
}

function Field(props: {
  id: string
  label: string
  value: string
  type?: "text" | "number"
  inputmode?: "decimal"
  min?: string
  step?: string
  required?: boolean
  onInput: (value: string) => void
}) {
  return (
    <div>
      <Label for={props.id}>{props.label}</Label>
      <Input
        id={props.id}
        type={props.type ?? "text"}
        inputmode={props.inputmode}
        min={props.min}
        step={props.step}
        required={props.required}
        value={props.value}
        class="mt-2"
        onInput={(event) => props.onInput(event.currentTarget.value)}
      />
    </div>
  )
}
