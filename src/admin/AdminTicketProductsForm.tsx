import { mdiDelete } from "@adaptive-ds/mdi/mdiDelete.js"
import { For, Index, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIconOnly } from "#ui/interactive/button/ButtonIconOnly.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { eventPriceFormat } from "../events/eventPriceFormat.ts"
import type { AdminCatalogPageState } from "./AdminCatalogPageState.ts"
import { adminTicketProductsFormStateCreate } from "./adminTicketProductsFormStateCreate.ts"

export function AdminTicketProductsForm(props: {
  state: AdminCatalogPageState
  formState?: ReturnType<typeof adminTicketProductsFormStateCreate>
}) {
  const state = props.formState ?? adminTicketProductsFormStateCreate(props.state)

  return (
    <div class="grid items-start gap-5 lg:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1.4fr)]">
      <div>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-content">Ticketprodukte</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            class="[.admin-workspace_&]:border-0 [.admin-workspace_&]:bg-surface-muted/70 dark:[.admin-workspace_&]:bg-slate-800/70"
            disabled={props.state.isSaving()}
            onClick={state.startNewTier}
          >
            Neue Ticket
          </Button>
        </div>
        <Show
          when={(props.state.selectedEvent()?.tiers.length ?? 0) > 0 || state.showNewTier()}
          fallback={<p class="mt-4 text-sm text-content-muted">Noch keine Ticketprodukte vorhanden.</p>}
        >
          <ul class="mt-4 flex flex-col gap-2" aria-label="Vorhandene Ticketprodukte">
            <For each={props.state.selectedEvent()?.tiers ?? []}>
              {(tier, index) => (
                <li
                  draggable={!props.state.isSaving()}
                  onDragStart={(event) => state.dragStart(event, tier.id)}
                  onDragOver={(event) => state.dragOver(event, tier.id)}
                  onDragEnd={state.dragEnd}
                  onDrop={(event) => state.drop(event, tier.id)}
                  class={state.dropTargetKey() === tier.id ? "rounded-lg ring-2 ring-brand" : ""}
                >
                  <Button
                    type="button"
                    variant="none"
                    size="none"
                    class={`flex w-full cursor-grab flex-col items-stretch justify-start rounded-lg border p-3 text-left font-normal transition-colors active:cursor-grabbing [.admin-workspace_&]:border-0 ${props.state.tierDraft().tierKey === tier.id ? "border-brand bg-brand/10" : "border-border bg-surface hover:bg-surface-muted [.admin-workspace_&]:bg-surface-muted/65 dark:[.admin-workspace_&]:bg-slate-800/65"}`}
                    aria-pressed={props.state.tierDraft().tierKey === tier.id}
                    onClick={() => state.selectTier(tier)}
                  >
                    <span class="block text-xs font-medium text-content-muted">
                      Pos. {index() + 1} · Zum Sortieren ziehen
                    </span>
                    <span class="mt-1 block font-semibold text-content">{tier.name}</span>
                    <span class="mt-1 block text-sm text-content-muted">{eventPriceFormat(tier.priceCents)}</span>
                    <span class="mt-1 block text-xs text-content-muted">
                      {tier.sold ?? 0} verkauft · {tier.available} verfügbar · {tier.capacity} gesamt
                    </span>
                  </Button>
                </li>
              )}
            </For>
            <Show when={state.showNewTier()}>
              <li>
                <Button
                  type="button"
                  variant="none"
                  size="none"
                  class="flex w-full flex-col items-stretch justify-start rounded-lg border border-brand bg-brand/10 p-3 text-left font-normal [.admin-workspace_&]:border-0"
                  aria-pressed="true"
                >
                  <span class="block text-xs font-medium text-content-muted">Neu · Noch nicht gespeichert</span>
                  <span class="mt-1 block font-semibold text-content">
                    {props.state.tierDraft().name || "Neues Ticket"}
                  </span>
                </Button>
              </li>
            </Show>
          </ul>
        </Show>
      </div>

      <CardWrapper class="lg:mt-13 [.admin-workspace_&]:rounded-xl [.admin-workspace_&]:border-0 [.admin-workspace_&]:shadow-lg [.admin-workspace_&]:shadow-slate-900/10 dark:[.admin-workspace_&]:shadow-black/30">
        <form
          class="flex flex-col gap-5"
          data-hydrated={state.hydrated() ? "true" : "false"}
          noValidate
          onSubmit={state.submit}
        >
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
          <div class="grid gap-4 sm:grid-cols-3">
            <Field
              id="admin-tier-starts"
              label="Beginn *"
              type="datetime-local"
              required
              value={state.startsAt()}
              onInput={state.startsAtChange}
            />
            <div>
              <Field
                id="admin-tier-doors"
                label="Einlass"
                type="datetime-local"
                value={state.doorsAt()}
                onInput={state.doorsAtChange}
              />
              <Index each={state.additionalDoorsAt()}>
                {(value, index) => (
                  <div class="mt-3 flex items-end gap-2">
                    <div class="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                      <Field
                        id={`admin-tier-doors-${index + 2}-starts`}
                        label={`Einlass ${index + 2} – Beginn`}
                        type="datetime-local"
                        required
                        value={value().startsAt}
                        onInput={(next) => state.additionalDoorsAtChange(index, next)}
                      />
                      <Field
                        id={`admin-tier-doors-${index + 2}-ends`}
                        label={`Einlass ${index + 2} – Ende`}
                        type="datetime-local"
                        required
                        value={value().endsAt}
                        onInput={(next) => state.additionalDoorsAtEndChange(index, next)}
                      />
                    </div>
                    <ButtonIconOnly
                      type="button"
                      variant="none"
                      icon={mdiDelete}
                      title={`Einlass ${index + 2} entfernen`}
                      aria-label={`Einlass ${index + 2} entfernen`}
                      class="shrink-0 text-content-muted"
                      disabled={props.state.isSaving()}
                      onClick={() => state.removeDoorsAt(index)}
                    />
                  </div>
                )}
              </Index>
              <Button
                type="button"
                variant="outline"
                class="mt-3 [.admin-workspace_&]:border-0 [.admin-workspace_&]:bg-surface-muted/70 dark:[.admin-workspace_&]:bg-slate-800/70"
                disabled={props.state.isSaving()}
                onClick={state.addDoorsAt}
              >
                Weiteren Einlass hinzufügen
              </Button>
            </div>
            <Field
              id="admin-tier-ends"
              label="Ende *"
              type="datetime-local"
              required
              value={state.endsAt()}
              onInput={state.endsAtChange}
            />
          </div>
          <div>
            <Label for="admin-tier-description">Beschreibung</Label>
            <Textarea
              id="admin-tier-description"
              class="mt-2 [.admin-workspace_&]:border-0"
              value={props.state.tierDraft().description}
              onInput={(event) => props.state.tierFieldChange("description", event.currentTarget.value)}
            />
          </div>

          <Show when={state.validationMessage()}>
            <p role="alert" class="text-sm font-medium text-danger">
              {state.validationMessage()}
            </p>
          </Show>
          <div class="border-t border-border pt-5 [.admin-workspace_&]:border-t-0">
            <div class="flex flex-wrap gap-3">
              <Button type="submit" variant="contrast" disabled={props.state.isSaving()}>
                {props.state.isSaving() ? "Speichert …" : "Ticketprodukt speichern"}
              </Button>
              <Show
                when={props.state.selectedEvent()?.tiers.some((tier) => tier.id === props.state.tierDraft().tierKey)}
              >
                <Button
                  type="button"
                  variant="outline"
                  class="[.admin-workspace_&]:border-0 [.admin-workspace_&]:bg-surface-muted/70 dark:[.admin-workspace_&]:bg-slate-800/70"
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
  type?: "text" | "number" | "datetime-local"
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
        class="mt-2 [.admin-workspace_&]:border-0"
        onInput={(event) => props.onInput(event.currentTarget.value)}
      />
    </div>
  )
}
