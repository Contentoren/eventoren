import { Show } from "solid-js"

import { Button } from "#ui/interactive/button/Button.jsx"
import { CopyButton } from "#ui/interactive/copy/CopyButton.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import type { DashProfilePageState } from "../dashProfilePageStateCreate.ts"
import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"

function dashProfileLinkStateCreate(inputs: { slug: () => string }) {
  const path = () => `eventoren.de/veranstalter/${inputs.slug()}`
  return { path }
}

type DashProfileLinkState = ReturnType<typeof dashProfileLinkStateCreate>

/** Profil-Sektion: öffentlicher Profil-Link mit Kopieren und bearbeitbarem Slug. */
export function DashProfileLink(p: { state: DashProfilePageState; disabled: boolean }) {
  const link = dashProfileLinkStateCreate({ slug: () => p.state.form.get()?.slug ?? "" })
  const errors = () => p.state.liveErrors()
  const editing = () => p.state.slugEditing.get()
  return (
    <DashSection title="Profil-Link" description="So finden dich deine Gäste im Netz.">
      <div class="flex flex-col gap-4">
        <DashField label="Öffentlicher Link">
          <div class="flex items-center gap-2">
            <p class="min-w-0 flex-1 truncate rounded-card border border-border-subtle bg-surface-muted px-3 py-2 text-sm text-content">
              {link.path()}
            </p>
            <CopyButton value={`https://${link.path()}`} size="sm" ariaLabel="Profil-Link kopieren" />
          </div>
        </DashField>
        <Show
          when={editing()}
          fallback={
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => p.state.slugEditing.set(true)}
                disabled={p.disabled}
                class="h-9 px-3 text-sm"
              >
                Profil-Link ändern
              </Button>
            </div>
          }
        >
          <DashField
            label="Link-Name (Slug)"
            for="dash-profile-slug"
            hint="Kleinbuchstaben, Zahlen und Bindestriche. Wird überall übernommen."
            error={errors()["slug"]}
          >
            <div class="flex items-center gap-2">
              <Input
                id="dash-profile-slug"
                value={p.state.form.get()?.slug ?? ""}
                placeholder="dein-name"
                maxlength={60}
                disabled={p.disabled}
                aria-invalid={errors()["slug"] ? "true" : undefined}
                onInput={(event) => p.state.setText("slug", event.currentTarget.value)}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => p.state.slugEditing.set(false)}
                class="h-9 shrink-0 px-3 text-sm"
              >
                Abbrechen
              </Button>
            </div>
          </DashField>
        </Show>
      </div>
    </DashSection>
  )
}
