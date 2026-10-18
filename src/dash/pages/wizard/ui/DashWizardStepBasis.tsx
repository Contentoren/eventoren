import { For, Show } from "solid-js"
import { mdiCheck } from "@adaptive-ds/mdi/mdiCheck.js"
import { mdiClockOutline } from "@adaptive-ds/mdi/mdiClockOutline.js"
import { mdiImageOutline } from "@adaptive-ds/mdi/mdiImageOutline.js"
import { mdiMapMarkerOutline } from "@adaptive-ds/mdi/mdiMapMarkerOutline.js"
import { mdiMusic } from "@adaptive-ds/mdi/mdiMusic.js"
import { mdiPalette } from "@adaptive-ds/mdi/mdiPalette.js"
import { mdiPartyPopper } from "@adaptive-ds/mdi/mdiPartyPopper.js"
import { mdiRun } from "@adaptive-ds/mdi/mdiRun.js"
import { mdiSchool } from "@adaptive-ds/mdi/mdiSchool.js"
import { mdiTent } from "@adaptive-ds/mdi/mdiTent.js"
import { mdiTheater } from "@adaptive-ds/mdi/mdiTheater.js"
import { mdiTrophy } from "@adaptive-ds/mdi/mdiTrophy.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { ImageDrop } from "#ui/input/image/ImageDrop.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { DashDateTimeInput } from "../../../ui/form/DashDateTimeInput.tsx"
import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import type { DashEventCategory } from "../../../model/dashEventCategorySchema.ts"
import type { DashWizardPageState } from "../dashWizardPageStateCreate.ts"
import { dashWizardGalleryImages } from "../dashWizardGalleryImages.ts"

const categoryMeta: { id: DashEventCategory; label: string; icon: string }[] = [
  { id: "konzert", label: "Konzert", icon: mdiMusic },
  { id: "party", label: "Party", icon: mdiPartyPopper },
  { id: "abiball", label: "Abiball", icon: mdiSchool },
  { id: "kurs", label: "Kurs", icon: mdiRun },
  { id: "kultur", label: "Kultur", icon: mdiTheater },
  { id: "sport", label: "Sport", icon: mdiTrophy },
  { id: "festival", label: "Festival", icon: mdiTent },
  { id: "sonstiges", label: "Sonstiges", icon: mdiPalette },
]

/** Schritt 1 „Basis“: Titel, Kategorie, Zeiten, Ort, Bild mit Live-Vorschau. */
export function DashWizardStepBasis(p: { state: DashWizardPageState }) {
  const state = p.state
  const errors = () => (state.showErrors.get() ? state.basisErrors() : {})

  return (
    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div class="flex min-w-0 flex-col gap-4">
        <DashSection title="Grundlagen" description="Titel, Kategorie und Termine.">
          <div class="flex flex-col gap-4">
            <DashField label="Titel" for="wizard-title" required error={errors().title}>
              <Input
                id="wizard-title"
                class="h-10 text-sm"
                value={state.title.get()}
                onInput={(event) => state.setTitle(event.currentTarget.value)}
                placeholder="z. B. Herbstkonzert"
              />
            </DashField>
            <DashField label="Untertitel" for="wizard-subtitle">
              <Input
                id="wizard-subtitle"
                class="h-10 text-sm"
                value={state.subtitle.get()}
                onInput={(event) => {
                  state.subtitle.set(event.currentTarget.value)
                  state.markDirty()
                }}
                placeholder="Ein Satz zum Abend"
              />
            </DashField>
            <DashField label="Kategorie">
              <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Kategorie wählen">
                <For each={categoryMeta}>
                  {(item) => (
                    <Button
                      type="button"
                      variant={state.category.get() === item.id ? buttonVariant.contrast : buttonVariant.outline}
                      class="h-9 gap-1.5 px-3 text-sm"
                      aria-pressed={state.category.get() === item.id}
                      onClick={() => {
                        state.category.set(item.id)
                        state.markDirty()
                      }}
                    >
                      <Icon path={item.icon} class="size-4" />
                      {item.label}
                    </Button>
                  )}
                </For>
              </div>
            </DashField>
            <div class="grid gap-4 sm:grid-cols-2">
              <DashField label="Beginn" for="wizard-starts" required error={errors().startsAt}>
                <DashDateTimeInput
                  id="wizard-starts"
                  valueIso={state.startsAt.get()}
                  onChange={(iso) => state.setStartsAt(iso)}
                  invalid={errors().startsAt !== undefined}
                />
              </DashField>
              <DashField label="Ende" for="wizard-ends" required error={errors().endsAt}>
                <DashDateTimeInput
                  id="wizard-ends"
                  valueIso={state.endsAt.get()}
                  onChange={(iso) => {
                    state.endsAt.set(iso)
                    state.markDirty()
                  }}
                  invalid={errors().endsAt !== undefined}
                />
              </DashField>
            </div>
            <DashField
              label="Einlass"
              for="wizard-doors"
              hint="Optional – Leer lassen, wenn der Einlass mit Beginn startet."
            >
              <div class="flex flex-col gap-2">
                <DashDateTimeInput
                  id="wizard-doors"
                  valueIso={state.doorsAt.get()}
                  onChange={(iso) => {
                    state.doorsAt.set(iso)
                    state.markDirty()
                  }}
                />
                <div>
                  <Button
                    type="button"
                    variant={buttonVariant.outline}
                    class="h-9 gap-1.5 px-3 text-sm"
                    onClick={() => state.setDoorsBefore(30)}
                    title="Einlass 30 Minuten vor Beginn"
                  >
                    <Icon path={mdiClockOutline} class="size-4" />
                    30 Min. vorher
                  </Button>
                </div>
              </div>
            </DashField>
          </div>
        </DashSection>

        <DashSection title="Ort" description="Wo findet dein Event statt?">
          <div class="flex flex-col gap-4">
            <Show when={state.recentVenues().length > 0}>
              <div class="flex flex-wrap gap-2">
                <For each={state.recentVenues()}>
                  {(venue) => (
                    <Button
                      type="button"
                      variant={buttonVariant.outline}
                      class="h-9 px-3 text-sm"
                      onClick={() => {
                        state.venueName.set(venue.name)
                        state.venueStreet.set(venue.street)
                        state.venueZip.set(venue.zip)
                        state.venueCity.set(venue.city)
                        state.markDirty()
                      }}
                    >
                      {venue.name}
                    </Button>
                  )}
                </For>
              </div>
            </Show>
            <DashField label="Name der Location" for="wizard-venue" required error={errors().venueName}>
              <Input
                id="wizard-venue"
                class="h-10 text-sm"
                value={state.venueName.get()}
                onInput={(event) => {
                  state.venueName.set(event.currentTarget.value)
                  state.markDirty()
                }}
                placeholder="z. B. Kulturhaus Lindenhof"
              />
            </DashField>
            <div class="grid gap-4 sm:grid-cols-2">
              <DashField label="Straße" for="wizard-street">
                <Input
                  id="wizard-street"
                  class="h-10 text-sm"
                  value={state.venueStreet.get()}
                  onInput={(event) => {
                    state.venueStreet.set(event.currentTarget.value)
                    state.markDirty()
                  }}
                  placeholder="Straße und Nummer"
                />
              </DashField>
              <div class="grid grid-cols-[96px_minmax(0,1fr)] gap-4">
                <DashField label="PLZ" for="wizard-zip">
                  <Input
                    id="wizard-zip"
                    class="h-10 text-sm"
                    value={state.venueZip.get()}
                    onInput={(event) => {
                      state.venueZip.set(event.currentTarget.value)
                      state.markDirty()
                    }}
                    placeholder="04109"
                  />
                </DashField>
                <DashField label="Stadt" for="wizard-city" required error={errors().venueCity}>
                  <Input
                    id="wizard-city"
                    class="h-10 text-sm"
                    value={state.venueCity.get()}
                    onInput={(event) => {
                      state.venueCity.set(event.currentTarget.value)
                      state.markDirty()
                    }}
                    placeholder="Leipzig"
                  />
                </DashField>
              </div>
            </div>
          </div>
        </DashSection>

        <DashSection title="Titelbild" description="16:9, dazu ein Alt-Text für alle Gäste.">
          <div class="flex flex-col gap-4">
            <DashField label="Bild" error={errors().imageUrl}>
              <Show
                when={state.imageUrl.get().length > 0}
                fallback={
                  <p class="text-sm text-content-muted">Wähle ein Bild aus der Galerie oder lade ein eigenes hoch.</p>
                }
              >
                <img
                  src={state.imageUrl.get()}
                  alt=""
                  class="aspect-video w-full rounded-control border border-border-subtle object-cover"
                />
              </Show>
              <div class="mt-3 grid grid-cols-3 gap-2">
                <For each={dashWizardGalleryImages}>
                  {(src, index) => {
                    const selected = () => state.imageUrl.get() === src
                    return (
                      <Button
                        type="button"
                        variant={buttonVariant.outline}
                        class={`relative aspect-video overflow-hidden rounded-control border p-0 ${selected() ? "border-brand ring-2 ring-brand/30" : "border-border-subtle"}`}
                        aria-pressed={selected()}
                        aria-label={`Bild ${index() + 1} wählen`}
                        onClick={() => {
                          state.imageUrl.set(src)
                          state.markDirty()
                        }}
                      >
                        <img src={src} alt="" class="size-full object-cover" loading="lazy" />
                        <Show when={selected()}>
                          <span class="absolute right-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-full bg-brand text-white">
                            <Icon path={mdiCheck} class="size-4" />
                          </span>
                        </Show>
                      </Button>
                    )
                  }}
                </For>
              </div>
              <div class="mt-3">
                <ImageDrop
                  value={dashWizardGalleryImages.includes(state.imageUrl.get()) ? null : state.imageUrl.get()}
                  onChange={(next) => {
                    if (next) state.imageUrl.set(next)
                    state.markDirty()
                  }}
                  aspect="16:9"
                  label="Eigenes Bild hochladen"
                />
              </div>
            </DashField>
            <DashField
              label="Alt-Text"
              for="wizard-alt"
              required
              error={errors().imageAlt}
              hint="Wird aus dem Titel vorbelegt – passe ihn gern an."
            >
              <Textarea
                id="wizard-alt"
                rows={2}
                value={state.imageAlt.get()}
                onInput={(event) => {
                  state.imageAlt.set(event.currentTarget.value)
                  state.imageAltTouched.set(true)
                  state.markDirty()
                }}
                placeholder="Was ist auf dem Bild zu sehen?"
              />
            </DashField>
          </div>
        </DashSection>

        <DashSection title="Beschreibung" description="Optional – du kannst sie später ergänzen.">
          <DashField label="Beschreibung" for="wizard-description">
            <Textarea
              id="wizard-description"
              rows={4}
              value={state.description.get()}
              onInput={(event) => {
                state.description.set(event.currentTarget.value)
                state.markDirty()
              }}
              placeholder="Worum geht es? Was erwartet die Gäste?"
            />
          </DashField>
        </DashSection>
      </div>

      <aside class="lg:sticky lg:top-20 lg:self-start">
        <div class="overflow-hidden rounded-card border border-border-subtle bg-surface">
          <Show
            when={state.imageUrl.get()}
            fallback={
              <div class="flex aspect-video items-center justify-center bg-surface-muted text-content-muted">
                <Icon path={mdiImageOutline} class="size-8" />
              </div>
            }
          >
            <img src={state.imageUrl.get()} alt="" class="aspect-video w-full object-cover" />
          </Show>
          <div class="flex flex-col gap-1.5 p-4">
            <Show when={state.previewDate()}>
              {(date) => <p class="text-xs font-medium uppercase tracking-wide text-brand">{date()}</p>}
            </Show>
            <p class="text-base font-semibold text-content">{state.title.get().trim() || "Dein Titel"}</p>
            <Show when={state.subtitle.get().trim()}>
              {(subtitle) => <p class="text-sm text-content-muted">{subtitle()}</p>}
            </Show>
            <p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-content-muted">
              <Show when={state.previewTime()}>
                {(time) => (
                  <span class="inline-flex items-center gap-1">
                    <Icon path={mdiClockOutline} class="size-4" />
                    {time()}
                  </span>
                )}
              </Show>
              <Show when={state.venueCity.get().trim()}>
                {(city) => (
                  <span class="inline-flex items-center gap-1">
                    <Icon path={mdiMapMarkerOutline} class="size-4" />
                    {city()}
                  </span>
                )}
              </Show>
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}
