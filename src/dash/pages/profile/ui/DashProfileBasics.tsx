import { cn } from "cn"
import { Show } from "solid-js"
import { ImageDrop } from "#ui/input/image/ImageDrop.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import type { DashProfilePageState } from "../dashProfilePageStateCreate.ts"

/** Profil-Sektion: Logo-Upload, Name und Untertitel mit Zählern. */
export function DashProfileBasics(p: { state: DashProfilePageState; disabled: boolean }) {
  const form = () => p.state.form.get()
  const errors = () => p.state.liveErrors()
  return (
    <DashSection title="Logo & Name" description="So erkennen dich deine Gäste auf den ersten Blick.">
      <div class="flex flex-col gap-5">
        <div class="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div class="w-full sm:max-w-52">
            <Show
              when={form()}
              fallback={<div class="aspect-square w-full rounded-full border border-border-subtle bg-surface-muted" />}
            >
              {(current) => (
                <ImageDrop
                  value={current().logoDataUrl}
                  onChange={(next) => p.state.setLogo(next)}
                  aspect="square"
                  shape="circle"
                  label="Logo"
                  hint="Quadratisch zugeschnitten, Initialen als Fallback."
                />
              )}
            </Show>
            <Show when={errors()["logoDataUrl"]}>
              {(message) => (
                <p role="alert" class="mt-1.5 text-xs text-danger dark:text-red-300">
                  {message()}
                </p>
              )}
            </Show>
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-5">
            <DashField label="Name" for="dash-profile-name" error={errors()["name"]} required>
              <Input
                id="dash-profile-name"
                value={form()?.name ?? ""}
                placeholder="Wie heißt du?"
                maxlength={80}
                disabled={p.disabled}
                aria-invalid={errors()["name"] ? "true" : undefined}
                onInput={(event) => p.state.setText("name", event.currentTarget.value)}
              />
            </DashField>
            <DashField
              label="Untertitel"
              for="dash-profile-subtitle"
              hint="Ein Satz, der dich beschreibt."
              error={errors()["subtitle"]}
            >
              <div class="flex flex-col gap-1">
                <Input
                  id="dash-profile-subtitle"
                  value={form()?.subtitle ?? ""}
                  placeholder="z. B. Konzerte, Lesungen und Feste im grünen Hof"
                  maxlength={80}
                  disabled={p.disabled}
                  aria-invalid={errors()["subtitle"] ? "true" : undefined}
                  onInput={(event) => p.state.setText("subtitle", event.currentTarget.value)}
                />
                <p
                  class={cn(
                    "text-right text-xs tabular-nums text-content-muted",
                    (form()?.subtitle.length ?? 0) > 80 && "text-danger",
                  )}
                >
                  {form()?.subtitle.length ?? 0} / 80
                </p>
              </div>
            </DashField>
          </div>
        </div>
      </div>
    </DashSection>
  )
}
