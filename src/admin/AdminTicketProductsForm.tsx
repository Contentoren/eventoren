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
    <div class="flex min-w-0 flex-col gap-6">
      <section aria-labelledby="admin-ticket-products-heading">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 id="admin-ticket-products-heading" class="text-lg font-semibold text-content">
            Ticketprodukte
          </h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            class="[.admin-workspace_&]:border-0 [.admin-workspace_&]:bg-surface-muted/70 dark:[.admin-workspace_&]:bg-slate-800/70"
            disabled={props.state.isSaving()}
            onClick={state.startNewTier}
          >
            Neues Ticket
          </Button>
        </div>
        <Show
          when={(props.state.selectedEvent()?.tiers.length ?? 0) > 0 || state.showNewTier()}
          fallback={<p class="mt-4 text-sm text-content-muted">Noch keine Ticketprodukte vorhanden.</p>}
        >
          <ul class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-label="Vorhandene Ticketprodukte">
            <For each={props.state.selectedEvent()?.tiers ?? []}>
              {(tier, index) => (
                <li
                  draggable={!props.state.isSaving()}
                  onDragStart={(event) => state.dragStart(event, tier.id)}
                  onDragOver={(event) => state.dragOver(event, tier.id)}
                  onDragEnd={state.dragEnd}
                  onDrop={(event) => state.drop(event, tier.id)}
                  class={`min-w-0 ${state.dropTargetKey() === tier.id ? "rounded-lg ring-2 ring-brand" : ""}`}
                >
                  <Button
                    type="button"
                    variant="none"
                    size="none"
                    class={`flex h-full w-full min-w-0 cursor-grab flex-col items-stretch justify-start rounded-lg p-2 text-left font-normal transition-colors active:cursor-grabbing sm:p-3 ${props.state.tierDraft().tierKey === tier.id ? "bg-brand/10 ring-1 ring-inset ring-brand/50" : "bg-surface-muted/70 hover:bg-surface-muted dark:bg-slate-800/70 dark:hover:bg-slate-800"}`}
                    aria-pressed={props.state.tierDraft().tierKey === tier.id}
                    onClick={() => state.selectTier(tier)}
                  >
                    <span class="flex flex-wrap items-center justify-between gap-x-2 text-xs font-medium text-content-muted">
                      <span>
                        Pos. {index() + 1} · <span class="sm:hidden">Ziehen</span>
                        <span class="hidden sm:inline">Zum Sortieren ziehen</span>
                      </span>
                      <Show when={props.state.tierDraft().tierKey === tier.id}>
                        <span class="text-brand-accent">Ausgewählt</span>
                      </Show>
                    </span>
                    <span class="mt-0.5 flex min-w-0 items-baseline justify-between gap-2 sm:mt-1 sm:block">
                      <span class="min-w-0 break-words font-semibold text-content">{tier.name}</span>
                      <span class="shrink-0 whitespace-nowrap text-sm text-content-muted sm:mt-1 sm:block">
                        {eventPriceFormat(tier.priceCents)}
                      </span>
                    </span>
                    <span class="mt-0.5 flex flex-wrap gap-x-2 text-xs text-content-muted sm:mt-1">
                      <span>{tier.sold ?? 0} verkauft</span>
                      <span>{tier.available} verfügbar</span>
                      <span>{tier.capacity} gesamt</span>
                    </span>
                  </Button>
                </li>
              )}
            </For>
            <Show when={state.showNewTier()}>
              <li class="min-w-0">
                <div class="flex h-full w-full min-w-0 flex-col items-stretch justify-start rounded-lg bg-brand/10 p-2 text-left font-normal ring-1 ring-inset ring-brand/50 sm:p-3">
                  <span class="block text-xs font-medium text-content-muted">Neu · Noch nicht gespeichert</span>
                  <span class="mt-0.5 block break-words font-semibold text-content sm:mt-1">
                    {props.state.tierDraft().name || "Neues Ticket"}
                  </span>
                </div>
              </li>
            </Show>
          </ul>
        </Show>
      </section>

      <CardWrapper class="min-w-0 rounded-xl border-0 bg-surface/70 p-4 shadow-none sm:p-6 lg:p-8">
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
          <div class="grid gap-4 md:grid-cols-2">
            <Field
              id="admin-tier-starts"
              label="Beginn *"
              type="datetime-local"
              required
              value={state.startsAt()}
              onInput={state.startsAtChange}
            />
            <Field
              id="admin-tier-ends"
              label="Ende *"
              type="datetime-local"
              required
              value={state.endsAt()}
              onInput={state.endsAtChange}
            />
            <div class="min-w-0 md:col-span-2">
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
                    <div class="grid min-w-0 flex-1 gap-3 md:grid-cols-2">
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
          <div class="pt-2">
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
    <div class="min-w-0">
      <Label for={props.id}>{props.label}</Label>
      <Input
        id={props.id}
        type={props.type ?? "text"}
        inputmode={props.inputmode}
        min={props.min}
        step={props.step}
        required={props.required}
        value={props.value}
        class={`mt-2 min-w-0 max-w-full ${props.type === "datetime-local" ? "max-sm:px-1" : ""} [.admin-workspace_&]:border-0`}
        onInput={(event) => props.onInput(event.currentTarget.value)}
      />
    </div>
  )
}
