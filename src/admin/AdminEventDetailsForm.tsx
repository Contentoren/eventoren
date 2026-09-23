import { mdiClose } from "@adaptive-ds/mdi/mdiClose.js"
import { For, type JSXElement, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { CorvuPopover } from "#ui/interactive/popover/CorvuPopover.jsx"
import { eventCategoryLabels } from "../events/eventCategoryLabels.ts"
import { eventImageUrlGet } from "../events/eventImageUrlGet.ts"
import type { AdminCatalogPageState } from "./AdminCatalogPageState.ts"
import { AdminEventFeedback } from "./AdminEventFeedback.tsx"
import { AdminEventHighlightsFields } from "./AdminEventHighlightsFields.tsx"
import { adminEventDetailsFormStateCreate } from "./adminEventDetailsFormStateCreate.ts"

export function AdminEventDetailsForm(props: { state: AdminCatalogPageState; onSaved?: (eventKey: string) => void }) {
  const state = adminEventDetailsFormStateCreate({ catalog: props.state, onSaved: props.onSaved })

  return (
    <form class="flex flex-col gap-6" data-hydrated={state.hydrated() ? "true" : "false"} onSubmit={state.submit}>
      <div>
        <h2 class="text-lg font-semibold text-content">Eventdetails</h2>
        <p class="mt-1 text-sm text-content-muted">Alle Angaben für Darstellung und Veröffentlichung.</p>
      </div>

      <FormSection title="Grundlagen">
        <div class="grid gap-4 sm:grid-cols-2">
          <Field
            id="admin-event-title"
            label="Titel"
            required
            value={props.state.eventDraft().title}
            onInput={(value) => props.state.eventFieldChange("title", value)}
          />
          <Field
            id="admin-event-subtitle"
            label="Untertitel"
            value={props.state.eventDraft().subtitle}
            onInput={(value) => props.state.eventFieldChange("subtitle", value)}
          />
          <Field
            id="admin-event-organizer"
            label="Veranstalter"
            value={props.state.eventDraft().organizer}
            onInput={(value) => props.state.eventFieldChange("organizer", value)}
          />
          <div>
            <Label for="admin-event-category">Kategorie</Label>
            <CorvuPopover
              id="admin-event-category"
              open={state.categoryPicker.categoryPickerOpen()}
              onOpenChange={state.categoryPicker.categoryPickerOpenChange}
              variant="outline"
              class="mt-2 w-full justify-start"
              buttonChildren={
                eventCategoryLabels[props.state.eventDraft().category] ?? props.state.eventDraft().category
              }
              innerClass="w-[min(24rem,calc(100vw-2rem))]"
            >
              <div class="flex max-h-96 flex-col gap-4 overflow-y-auto p-1">
                <div class="flex flex-col gap-2">
                  <p class="text-sm font-semibold text-content">Vorhandene Kategorien</p>
                  <For each={state.categoryPicker.categoryOptions()}>
                    {(category) => (
                      <div class="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          class="flex-1"
                          onClick={() => state.categoryPicker.categorySelect(category)}
                        >
                          {eventCategoryLabels[category] ?? category}
                        </Button>
                        <ButtonIcon
                          type="button"
                          variant="outline"
                          icon={mdiClose}
                          aria-label={`Kategorie ${eventCategoryLabels[category] ?? category} entfernen`}
                          onClick={() => void state.categoryPicker.categoryRemove(category)}
                        />
                      </div>
                    )}
                  </For>
                </div>
                <div class="order-first flex flex-col gap-3 border-t border-border pt-4">
                  <Label for="admin-new-event-category">Neue Kategorie</Label>
                  <Input
                    id="admin-new-event-category"
                    value={state.categoryPicker.newCategory.get()}
                    onInput={(event) => state.categoryPicker.newCategory.set(event.currentTarget.value)}
                  />
                  <Button type="button" onClick={state.categoryPicker.categoryCreate}>
                    Kategorie hinzufügen
                  </Button>
                </div>
              </div>
            </CorvuPopover>
          </div>
        </div>
        <div class="mt-4">
          <Label for="admin-event-description">Beschreibung</Label>
          <Textarea
            id="admin-event-description"
            class="mt-2 min-h-32"
            value={props.state.eventDraft().description}
            onInput={(event) => props.state.eventFieldChange("description", event.currentTarget.value)}
          />
        </div>
      </FormSection>

      <FormSection title="Datum & Ort">
        <div class="grid gap-4 sm:grid-cols-3">
          <Field
            id="admin-event-starts"
            label="Beginn"
            type="datetime-local"
            value={state.startsAt()}
            onInput={state.startsAtChange}
          />
          <Field
            id="admin-event-doors"
            label="Einlass"
            type="datetime-local"
            value={state.doorsAt()}
            onInput={state.doorsAtChange}
          />
          <Field
            id="admin-event-ends"
            label="Ende"
            type="datetime-local"
            value={state.endsAt()}
            onInput={state.endsAtChange}
          />
        </div>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            id="admin-event-venue"
            label="Veranstaltungsort"
            value={props.state.eventDraft().venue}
            onInput={(value) => props.state.eventFieldChange("venue", value)}
          />
          <Field
            id="admin-event-city"
            label="Stadt"
            value={props.state.eventDraft().city}
            onInput={(value) => props.state.eventFieldChange("city", value)}
          />
          <Field
            id="admin-event-address"
            label="Adresse"
            class="sm:col-span-2"
            value={props.state.eventDraft().address}
            onInput={(value) => props.state.eventFieldChange("address", value)}
          />
        </div>
      </FormSection>

      <FormSection title="Erscheinungsbild">
        <div class="grid gap-4 sm:grid-cols-2">
          <Field
            id="admin-event-image"
            label="Bild-URL"
            type="url"
            value={props.state.eventDraft().imageUrl}
            onInput={state.imageUrlChange}
          />
          <Field
            id="admin-event-image-alt"
            label="Alternativtext"
            value={props.state.eventDraft().imageAlt}
            onInput={(value) => props.state.eventFieldChange("imageAlt", value)}
          />
          <fieldset
            class={`sm:col-span-2 rounded-lg border border-dashed p-4 ${state.imageDragActive() ? "border-brand bg-brand/5" : "border-border"}`}
            onDragOver={(event) => {
              event.preventDefault()
              state.imageDragStart()
            }}
            onDragLeave={state.imageDragEnd}
            onDrop={(event) => {
              event.preventDefault()
              state.imageDragEnd()
              void state.imageUpload(event.dataTransfer?.files[0])
            }}
          >
            <legend class="px-1 text-sm font-medium text-content">Bilddatei ablegen oder auswählen</legend>
            <input
              id="admin-event-image-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif"
              class="mt-2 block w-full text-sm text-content-muted file:mr-3 file:rounded-control file:border-0 file:bg-surface-muted file:px-3 file:py-2 file:font-medium file:text-content"
              aria-describedby="admin-event-image-upload-help"
              disabled={state.imageUploading()}
              onChange={(event) => {
                void state.imageUpload(event.currentTarget.files?.[0])
                event.currentTarget.value = ""
              }}
            />
            <p id="admin-event-image-upload-help" class="mt-2 text-sm text-content-muted">
              JPEG, PNG, WebP oder AVIF, maximal 10 MB. Alternativ kannst du oben eine Bild-URL eingeben.
            </p>
            <Show when={state.imageUploading()}>
              <p role="status" class="mt-2 text-sm text-content-muted">
                Bild wird hochgeladen …
              </p>
            </Show>
            <Show when={state.imageUploadError()}>
              <p role="alert" class="mt-2 text-sm text-danger">
                {state.imageUploadError()}
              </p>
            </Show>
            <Show when={props.state.eventDraft().imageUrl}>
              <img
                class="mt-3 max-h-48 rounded-control object-cover"
                src={eventImageUrlGet(
                  props.state.eventDraft().imageVariants?.detail ?? props.state.eventDraft().imageUrl,
                )}
                alt="Vorschau des Eventbilds"
              />
            </Show>
          </fieldset>
        </div>
      </FormSection>

      <FormSection title="Highlights">
        <AdminEventHighlightsFields state={props.state} />
      </FormSection>

      <FormSection title="Leistungen">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <Label for="admin-event-inclusions">Inklusive</Label>
            <Textarea
              id="admin-event-inclusions"
              class="mt-2 min-h-32"
              value={props.state.eventDraft().inclusions.join("\n")}
              onInput={(event) => props.state.eventFieldChange("inclusions", event.currentTarget.value.split("\n"))}
            />
            <p class="mt-1 text-sm text-content-muted">Eine Leistung pro Zeile.</p>
          </div>
          <div>
            <Label for="admin-event-exclusions">Nicht enthalten</Label>
            <Textarea
              id="admin-event-exclusions"
              class="mt-2 min-h-32"
              value={props.state.eventDraft().exclusions.join("\n")}
              onInput={(event) => props.state.eventFieldChange("exclusions", event.currentTarget.value.split("\n"))}
            />
            <p class="mt-1 text-sm text-content-muted">Eine Leistung pro Zeile.</p>
          </div>
        </div>
      </FormSection>

      <FormSection title="Veröffentlichung">
        <Label for="admin-event-status">Katalogstatus</Label>
        <SelectSingleNative
          id="admin-event-status"
          class="mt-2"
          valueSignal={state.statusSignal}
          getOptions={state.statusOptions}
          valueText={state.statusLabel}
        />
        <Show when={!state.canPublish()}>
          <p class="mt-2 text-sm text-content-muted">
            Veröffentlichen ist möglich, sobald das Event gespeichert ist und mindestens ein Ticketprodukt hat.
          </p>
        </Show>
      </FormSection>

      <details class="rounded-lg border border-border bg-surface-muted p-4 text-content">
        <summary class="cursor-pointer font-semibold">Erweitert</summary>
        <div class="mt-4">
          <Field
            id="admin-event-key"
            label="Technischer Event-Key"
            required
            value={props.state.eventDraft().eventKey}
            onInput={(value) => props.state.eventFieldChange("eventKey", value)}
          />
        </div>
      </details>

      <Show when={state.validationMessage()}>
        <p role="alert" class="text-sm font-medium text-danger">
          {state.validationMessage()}
        </p>
      </Show>
      <AdminEventFeedback state={props.state} />
      <div class="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <Button type="submit" disabled={props.state.isSaving() || state.imageUploading() || !!state.pendingAction()}>
          {state.pendingAction() === "save" ? "Speichert …" : "Änderungen speichern"}
        </Button>
        <Button
          type="button"
          variant="filledGreen"
          disabled={props.state.isSaving() || state.imageUploading() || !!state.pendingAction() || !state.canPublish()}
          onClick={state.publish}
        >
          {state.pendingAction() === "publish" ? "Wird veröffentlicht …" : "Veröffentlichen"}
        </Button>
      </div>
    </form>
  )
}

function FormSection(props: { title: string; children: JSXElement }) {
  return (
    <section class="rounded-lg border border-border bg-surface p-4">
      <h3 class="mb-4 font-semibold text-content">{props.title}</h3>
      {props.children}
    </section>
  )
}

function Field(props: {
  id: string
  label: string
  value: string
  class?: string
  type?: "text" | "url" | "datetime-local"
  required?: boolean
  onInput: (value: string) => void
}) {
  return (
    <div class={props.class}>
      <Label for={props.id}>{props.label}</Label>
      <Input
        id={props.id}
        type={props.type ?? "text"}
        value={props.value}
        required={props.required}
        class="mt-2"
        onInput={(event) => props.onInput(event.currentTarget.value)}
      />
    </div>
  )
}
