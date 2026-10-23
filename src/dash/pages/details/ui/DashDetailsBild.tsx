import { mdiCheck } from "@adaptive-ds/mdi/mdiCheck.js"
import { mdiImagePlusOutline } from "@adaptive-ds/mdi/mdiImagePlusOutline.js"
import { mdiPencilOutline } from "@adaptive-ds/mdi/mdiPencilOutline.js"
import { cn } from "cn"
import { For, Show } from "solid-js"
import { imageList } from "#src/app/assets/imageList.ts"
import { urlImage } from "#src/app/assets/urlImage.ts"
import { ImageDrop } from "#ui/input/image/ImageDrop.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { Sheet } from "#ui/interactive/sheet/Sheet.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"

import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import type { DashDetailsPageState } from "../dashDetailsPageStateCreate.ts"
import { dashDetailsBildStateCreate } from "./dashDetailsBildStateCreate.ts"

/** Sektion „Bild“: 16:9-Vorschau mit Galerie-Auswahl und Alt-Text-Pflichtfeld. */
export function DashDetailsBild(p: { state: DashDetailsPageState }) {
  const draft = () => p.state.draft()
  const disabled = () => !p.state.canEdit()
  const showErrors = () => p.state.showErrorsSignal.get()
  const errors = () => p.state.errors()
  const local = dashDetailsBildStateCreate({
    canEdit: () => p.state.canEdit(),
    onPick: (url) => p.state.setDraft({ imageUrl: url }),
  })

  const imageAltLength = () => draft()?.imageAlt.trim().length ?? 0
  const altInvalid = () => (showErrors() && errors()?.imageAlt ? true : undefined)

  return (
    <DashSection
      id="details-bild"
      title="Bild"
      description="Dein Titelbild im Querformat 16:9."
      actions={
        <Show when={!disabled()}>
          <Button type="button" variant={buttonVariant.outline} class="h-9 px-3 text-sm" onClick={local.openPicker}>
            <Icon path={mdiPencilOutline} class="size-4" />
            Ändern
          </Button>
        </Show>
      }
      class="scroll-mt-24"
    >
      <div class="flex flex-col gap-4">
        <div class="overflow-hidden rounded-card border border-border-subtle bg-surface-muted">
          <Show
            when={draft()?.imageUrl}
            fallback={
              <div class="flex aspect-video flex-col items-center justify-center gap-2 text-content-muted">
                <Icon path={mdiImagePlusOutline} class="size-8" />
                <p class="text-sm">Noch kein Bild gewählt</p>
              </div>
            }
          >
            {(url) => (
              <img
                src={url()}
                alt={draft()?.imageAlt || "Vorschau deines Eventbilds"}
                class="aspect-video w-full object-cover"
              />
            )}
          </Show>
        </div>
        <DashField
          label="Alt-Text"
          for="details-image-alt"
          required
          hint="Beschreibe dein Bild kurz für Screenreader."
          error={showErrors() ? errors()?.imageAlt : null}
        >
          <div class="flex flex-col gap-1.5">
            <Input
              id="details-image-alt"
              value={draft()?.imageAlt ?? ""}
              placeholder="z. B. Beleuchtete Konzertbühne mit Publikum"
              maxLength={150}
              disabled={disabled()}
              aria-invalid={altInvalid() ? "true" : undefined}
              class={cn("h-10 text-sm rounded-control", altInvalid() && "border-danger")}
              onInput={(event) => p.state.setDraft({ imageAlt: event.currentTarget.value })}
            />
            <p
              class={`text-right text-xs tabular-nums ${imageAltLength() > 150 ? "text-danger" : "text-content-muted"}`}
            >
              {imageAltLength()} / 150
            </p>
          </div>
        </DashField>
        <Sheet
          open={local.pickerOpen.get()}
          onOpenChange={(open) => {
            if (!open) local.closePicker()
          }}
          title="Bild wählen"
          description="Wähle ein Galeriebild oder lade dein eigenes hoch."
          footer={
            <Button type="button" variant={buttonVariant.outline} class="h-9 px-3 text-sm" onClick={local.closePicker}>
              Abbrechen
            </Button>
          }
        >
          <div class="flex flex-col gap-4">
            <ul class="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Galerie">
              <For each={local.galleryKeys}>
                {(key) => {
                  const url = urlImage(imageList[key as keyof typeof imageList])
                  const active = () => draft()?.imageUrl === url
                  return (
                    <li>
                      <Button
                        type="button"
                        variant={active() ? buttonVariant.contrast : buttonVariant.ghost}
                        aria-pressed={active()}
                        onClick={() => local.pick(url)}
                        class="h-auto w-full overflow-hidden rounded-control border border-border-subtle p-0"
                      >
                        <span class="relative block w-full">
                          <img src={url} alt="" loading="lazy" class="aspect-video w-full object-cover" />
                          <Show when={active()}>
                            <span class="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-brand text-white">
                              <Icon path={mdiCheck} class="size-4" />
                            </span>
                          </Show>
                        </span>
                      </Button>
                    </li>
                  )
                }}
              </For>
            </ul>
            <ImageDrop
              value={null}
              aspect="16:9"
              label="Eigenes Bild"
              hint="Ziehe dein Bild hierher oder wähle eine Datei."
              onChange={(dataUrl) => {
                if (dataUrl) local.pick(dataUrl)
              }}
            />
          </div>
        </Sheet>
      </div>
    </DashSection>
  )
}
