import { mdiClose } from "@adaptive-ds/mdi/mdiClose.js"
import { Link } from "@tanstack/solid-router"
import type { JSX } from "solid-js"
import { For, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { CorvuPopover } from "#ui/interactive/popover/CorvuPopover.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { eventCategoryLabels } from "../events/eventCategoryLabels.ts"
import { UiContainer } from "../ui/UiContainer.tsx"
import type { AdminCatalogPageState } from "./AdminCatalogPageState.ts"
import { AdminMemberManagement } from "./AdminMemberManagement.tsx"
import type { AdminMemberManagementState } from "./AdminMemberManagementState.ts"
import { adminCategoryPickerStateCreate } from "./adminCategoryPickerStateCreate.ts"

export function AdminCatalogPage(props: {
  state: AdminCatalogPageState
  memberState?: AdminMemberManagementState
  description?: string
  headerSlot?: JSX.Element
  eventViewHref?: (eventKey: string) => string
}) {
  const state = props.state
  const categoryPicker = adminCategoryPickerStateCreate({ catalog: state })

  return (
    <main id="content" tabindex="-1">
      <UiContainer width="wide" class="flex flex-col gap-8 py-10">
        {props.headerSlot}
        <header class="flex flex-col gap-3">
          <h1 class="text-3xl font-semibold tracking-tight text-content sm:text-4xl">Events & Ticketprodukte</h1>
          <p class="max-w-3xl text-sm leading-relaxed text-content-muted">
            {props.description ??
              "Änderungen werden über die autorisierten Convex-Mutationen gespeichert. Verkaufspreise und Bestand werden niemals aus Browserdaten übernommen."}
          </p>
        </header>

        <Show when={props.memberState}>{(memberState) => <AdminMemberManagement state={memberState()} />}</Show>

        <Show
          when={state.isAuthorized()}
          fallback={
            <CardWrapper>
              <h2 class="text-lg font-semibold text-content">Admin-Zugriff erforderlich</h2>
              <p class="mt-2 text-sm text-content-muted">
                Bitte melde dich mit einer Admin- oder Dev-Sitzung an. Die Berechtigung wird zusätzlich serverseitig
                geprüft.
              </p>
            </CardWrapper>
          }
        >
          <Show when={state.errorMessage()}>
            <p
              role="alert"
              class="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200"
            >
              {state.errorMessage()}
            </p>
          </Show>
          <Show when={state.successMessage()}>
            <p
              role="status"
              class="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-700 dark:bg-green-950/40 dark:text-green-200"
            >
              {state.successMessage()}
            </p>
          </Show>

          <div class="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <CardWrapper>
              <div class="flex items-center justify-between gap-3">
                <h2 class="text-lg font-semibold text-content">Veröffentlichte Events</h2>
                <Button size="sm" variant="outline" onClick={state.startNewEvent}>
                  Neu
                </Button>
              </div>
              <Show
                when={!state.isLoading?.()}
                fallback={
                  <p class="mt-4 text-sm text-content-muted" aria-live="polite">
                    Events werden geladen …
                  </p>
                }
              >
                <Show
                  when={state.events().length > 0}
                  fallback={
                    <p class="mt-4 text-sm text-content-muted">Noch keine veröffentlichten Events im Katalog.</p>
                  }
                >
                  <ul class="mt-4 flex flex-col gap-2">
                    <For each={state.events()}>
                      {(event) => (
                        <li>
                          <Button
                            type="button"
                            variant="outline"
                            class="w-full rounded-md border border-border p-3 text-left transition-colors hover:bg-surface-muted"
                            classList={{ "bg-surface-muted": state.selectedEventKey() === event.id }}
                            onClick={() => state.selectEvent(event)}
                          >
                            <span class="block truncate text-sm font-semibold text-content">{event.title}</span>
                            <span class="mt-1 block text-xs text-content-muted">{event.id}</span>
                          </Button>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
              </Show>
            </CardWrapper>

            <div class="flex flex-col gap-8">
              <CardWrapper>
                <form
                  class="flex flex-col gap-5"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void state.saveEvent()
                  }}
                >
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <h2 class="text-lg font-semibold text-content">Eventdetails</h2>
                    <Badge variant="subtle">{state.eventDraft().status}</Badge>
                  </div>
                  <div class="grid gap-4 sm:grid-cols-2">
                    <Field
                      id="admin-event-key"
                      label="Event-Key"
                      value={state.eventDraft().eventKey}
                      onInput={(value) => state.eventFieldChange("eventKey", value)}
                    />
                    <Field
                      id="admin-event-title"
                      label="Titel"
                      value={state.eventDraft().title}
                      onInput={(value) => state.eventFieldChange("title", value)}
                    />
                    <Field
                      id="admin-event-subtitle"
                      label="Untertitel"
                      value={state.eventDraft().subtitle}
                      onInput={(value) => state.eventFieldChange("subtitle", value)}
                    />
                    <Field
                      id="admin-event-organizer"
                      label="Veranstalter"
                      value={state.eventDraft().organizer}
                      onInput={(value) => state.eventFieldChange("organizer", value)}
                    />
                    <Field
                      id="admin-event-starts"
                      label="Beginn (ISO)"
                      value={state.eventDraft().startsAt}
                      onInput={(value) => state.eventFieldChange("startsAt", value)}
                    />
                    <Field
                      id="admin-event-ends"
                      label="Ende (ISO)"
                      value={state.eventDraft().endsAt}
                      onInput={(value) => state.eventFieldChange("endsAt", value)}
                    />
                    <Field
                      id="admin-event-doors"
                      label="Einlass (ISO)"
                      value={state.eventDraft().doorsAt}
                      onInput={(value) => state.eventFieldChange("doorsAt", value)}
                    />
                    <Field
                      id="admin-event-venue"
                      label="Veranstaltungsort"
                      value={state.eventDraft().venue}
                      onInput={(value) => state.eventFieldChange("venue", value)}
                    />
                    <Field
                      id="admin-event-city"
                      label="Stadt"
                      value={state.eventDraft().city}
                      onInput={(value) => state.eventFieldChange("city", value)}
                    />
                    <Field
                      id="admin-event-address"
                      label="Adresse"
                      value={state.eventDraft().address}
                      onInput={(value) => state.eventFieldChange("address", value)}
                    />
                    <Field
                      id="admin-event-image"
                      label="Bild-URL"
                      value={state.eventDraft().imageUrl}
                      onInput={(value) => state.eventFieldChange("imageUrl", value)}
                    />
                    <Field
                      id="admin-event-image-alt"
                      label="Bild-Alt-Text"
                      value={state.eventDraft().imageAlt}
                      onInput={(value) => state.eventFieldChange("imageAlt", value)}
                    />
                  </div>
                  <div>
                    <Label for="admin-event-category">Kategorie</Label>
                    <CorvuPopover
                      id="admin-event-category"
                      open={categoryPicker.categoryPickerOpen()}
                      onOpenChange={categoryPicker.categoryPickerOpenChange}
                      variant="outline"
                      class="mt-2 w-full justify-start"
                      buttonChildren={eventCategoryLabels[state.eventDraft().category] ?? state.eventDraft().category}
                      innerClass="w-[min(24rem,calc(100vw-2rem))]"
                    >
                      <div class="flex max-h-96 flex-col gap-4 overflow-y-auto p-1">
                        <div class="flex flex-col gap-2">
                          <p class="text-sm font-semibold text-content">Vorhandene Kategorien</p>
                          <For each={categoryPicker.categoryOptions()}>
                            {(category) => (
                              <div class="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  class="flex-1"
                                  onClick={() => categoryPicker.categorySelect(category)}
                                >
                                  {eventCategoryLabels[category] ?? category}
                                </Button>
                                <ButtonIcon
                                  type="button"
                                  variant="outline"
                                  icon={mdiClose}
                                  aria-label={`Kategorie ${eventCategoryLabels[category] ?? category} entfernen`}
                                  onClick={() => void categoryPicker.categoryRemove(category)}
                                />
                              </div>
                            )}
                          </For>
                        </div>
                        <form
                          class="flex flex-col gap-3 border-t border-border pt-4"
                          onSubmit={(event) => {
                            event.preventDefault()
                            categoryPicker.categoryCreate()
                          }}
                        >
                          <Label for="admin-new-event-category">Neue Kategorie</Label>
                          <Input
                            id="admin-new-event-category"
                            value={categoryPicker.newCategory.get()}
                            onInput={(event) => categoryPicker.newCategory.set(event.currentTarget.value)}
                          />
                          <Button type="submit">Kategorie hinzufügen</Button>
                        </form>
                      </div>
                    </CorvuPopover>
                  </div>
                  <div>
                    <Label for="admin-event-status">Katalogstatus</Label>
                    <select
                      id="admin-event-status"
                      class="mt-2 block w-full rounded-md border border-input bg-gray-50 p-2.5 text-gray-900 dark:bg-gray-700 dark:text-white"
                      value={state.eventDraft().status}
                      onChange={(event) =>
                        state.eventFieldChange(
                          "status",
                          event.currentTarget.value as "draft" | "published" | "archived",
                        )
                      }
                    >
                      <option value="draft">Entwurf</option>
                      <option value="published">Veröffentlicht</option>
                      <option value="archived">Archiviert</option>
                    </select>
                  </div>
                  <Field
                    id="admin-event-tags"
                    label="Tags (kommagetrennt)"
                    value={state.eventDraft().tags}
                    onInput={(value) => state.eventFieldChange("tags", value)}
                  />
                  <div>
                    <Label for="admin-event-description">Beschreibung</Label>
                    <Textarea
                      id="admin-event-description"
                      class="mt-2"
                      value={state.eventDraft().description}
                      onInput={(event) => state.eventFieldChange("description", event.currentTarget.value)}
                    />
                  </div>
                  <div class="flex flex-wrap gap-3">
                    <Button type="submit" disabled={state.isSaving()}>
                      {state.isSaving() ? "Speichert …" : "Event speichern"}
                    </Button>
                    <Button
                      type="button"
                      variant="filledGreen"
                      disabled={state.isSaving() || !state.eventDraft().eventKey}
                      onClick={() => void state.publishEvent()}
                    >
                      Veröffentlichen
                    </Button>
                    <Show when={props.eventViewHref && state.selectedEventKey()}>
                      <Link
                        to={props.eventViewHref?.(state.selectedEventKey())}
                        class="focus-ring inline-flex h-10 items-center justify-center rounded-control border border-border px-space-4 text-sm font-semibold text-content transition-colors hover:bg-surface-muted"
                      >
                        Öffentliche Ansicht ↗
                      </Link>
                    </Show>
                  </div>
                </form>
              </CardWrapper>

              <CardWrapper>
                <form
                  class="flex flex-col gap-5"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void state.saveTier()
                  }}
                >
                  <div class="flex items-center justify-between gap-3">
                    <h2 class="text-lg font-semibold text-content">Ticketprodukt</h2>
                    <span class="text-xs text-content-muted">
                      {state.selectedEvent()?.title ?? "Event zuerst speichern"}
                    </span>
                  </div>
                  <ul class="flex flex-wrap gap-2" aria-label="Vorhandene Ticketprodukte">
                    <For each={state.selectedEvent()?.tiers ?? []}>
                      {(tier) => (
                        <li>
                          <Button
                            type="button"
                            variant="outline"
                            class="rounded-full px-3 py-1 text-xs text-content-muted hover:bg-surface-muted"
                            onClick={() => state.selectTier(tier)}
                          >
                            {tier.name} · {tier.available} verfügbar
                          </Button>
                        </li>
                      )}
                    </For>
                  </ul>
                  <p class="text-xs text-content-muted">
                    Bei bestehenden Produkten bitte die gesamte Kapazität eingeben; reservierte und verkaufte Mengen
                    bleiben serverseitig geschützt.
                  </p>
                  <div class="grid gap-4 sm:grid-cols-2">
                    <Field
                      id="admin-tier-key"
                      label="Tier-Key"
                      value={state.tierDraft().tierKey}
                      onInput={(value) => state.tierFieldChange("tierKey", value)}
                    />
                    <Field
                      id="admin-tier-name"
                      label="Name"
                      value={state.tierDraft().name}
                      onInput={(value) => state.tierFieldChange("name", value)}
                    />
                    <Field
                      id="admin-tier-price"
                      label="Preis (Cent)"
                      type="number"
                      value={state.tierDraft().priceCents}
                      onInput={(value) => state.tierFieldChange("priceCents", value)}
                    />
                    <Field
                      id="admin-tier-fee"
                      label="Gebühr (Cent)"
                      type="number"
                      value={state.tierDraft().feeCents}
                      onInput={(value) => state.tierFieldChange("feeCents", value)}
                    />
                    <Field
                      id="admin-tier-capacity"
                      label="Kapazität"
                      type="number"
                      value={state.tierDraft().capacity}
                      onInput={(value) => state.tierFieldChange("capacity", value)}
                    />
                    <Field
                      id="admin-tier-sort"
                      label="Sortierung"
                      type="number"
                      value={state.tierDraft().sortOrder}
                      onInput={(value) => state.tierFieldChange("sortOrder", value)}
                    />
                  </div>
                  <div>
                    <Label for="admin-tier-description">Beschreibung</Label>
                    <Textarea
                      id="admin-tier-description"
                      class="mt-2"
                      value={state.tierDraft().description}
                      onInput={(event) => state.tierFieldChange("description", event.currentTarget.value)}
                    />
                  </div>
                  <Button type="submit" disabled={state.isSaving() || !state.eventDraft().eventKey}>
                    {state.isSaving() ? "Speichert …" : "Ticketprodukt speichern"}
                  </Button>
                </form>
              </CardWrapper>
            </div>
          </div>
        </Show>
      </UiContainer>
    </main>
  )
}

function Field(props: {
  id: string
  label: string
  value: string
  type?: "text" | "number"
  onInput: (value: string) => void
}) {
  return (
    <div>
      <Label for={props.id}>{props.label}</Label>
      <Input
        id={props.id}
        type={props.type ?? "text"}
        value={props.value}
        class="mt-2"
        onInput={(event) => props.onInput(event.currentTarget.value)}
      />
    </div>
  )
}
