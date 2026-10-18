import { For, Show } from "solid-js"
import { mdiAccountGroupOutline } from "@adaptive-ds/mdi/mdiAccountGroupOutline.js"
import { mdiAccountOutline } from "@adaptive-ds/mdi/mdiAccountOutline.js"
import { mdiCheckCircleOutline } from "@adaptive-ds/mdi/mdiCheckCircleOutline.js"
import { mdiDomain } from "@adaptive-ds/mdi/mdiDomain.js"
import { mdiInformationOutline } from "@adaptive-ds/mdi/mdiInformationOutline.js"
import { mdiSchoolOutline } from "@adaptive-ds/mdi/mdiSchoolOutline.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { ImageDrop } from "#ui/input/image/ImageDrop.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"

import type { DashOrgKind } from "../../../model/dashOrgKindSchema.ts"
import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import type { DashOnboardingPageState } from "../dashOnboardingPageStateCreate.ts"

const kindMeta: { id: DashOrgKind; label: string; hint: string; icon: string }[] = [
  { id: "verein", label: "Verein", hint: "z. B. Sportverein, Chor", icon: mdiAccountGroupOutline },
  { id: "unternehmen", label: "Unternehmen", hint: "z. B. GmbH, Studio", icon: mdiDomain },
  { id: "schule", label: "Schule / Abikomitee", hint: "z. B. Abiball-Team", icon: mdiSchoolOutline },
  { id: "privat", label: "Privatperson", hint: "z. B. private Feier", icon: mdiAccountOutline },
]

/** Schritt 2 „Organisation“: Art, Name, live geprüfter Slug und optionales Logo. */
export function DashOnboardingStepOrg(p: { state: DashOnboardingPageState }) {
  const state = p.state
  const errors = () => (state.showErrors.get() ? state.errors() : {})
  const slug = () => state.slugCheck()

  return (
    <div class="flex flex-col gap-4">
      <DashSection title="Was veranstaltest du?" description="Wähle die passende Art für deine Organisation.">
        <div class="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Art der Organisation wählen">
          <For each={kindMeta}>
            {(item) => {
              const selected = () => state.kind.get() === item.id
              return (
                <Button
                  type="button"
                  variant={selected() ? buttonVariant.contrast : buttonVariant.outline}
                  class="h-auto flex-col items-start gap-1 px-3 py-2.5 text-left"
                  aria-pressed={selected()}
                  onClick={() => state.set(state.kind, item.id)}
                >
                  <span class="flex items-center gap-1.5 text-sm font-semibold">
                    <Icon path={item.icon} class="size-4" />
                    {item.label}
                  </span>
                  <span class="text-xs font-normal opacity-80">{item.hint}</span>
                </Button>
              )
            }}
          </For>
        </div>
      </DashSection>

      <DashSection title="Name & Auftritt" description="So finden dich deine Gäste auf eventoren.de.">
        <div class="flex flex-col gap-4">
          <DashField label="Name" for="onboarding-orgname" required error={errors().orgName}>
            <Input
              id="onboarding-orgname"
              class="h-10 text-sm"
              value={state.orgName.get()}
              onInput={(event) => state.setOrgName(event.currentTarget.value)}
              placeholder="z. B. Tanzschule Rhythmus"
              maxlength={80}
            />
          </DashField>
          <DashField
            label="Profil-Link"
            for="onboarding-slug"
            required
            error={errors().slug}
            hint="Dein öffentlicher Link auf eventoren.de."
          >
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center gap-0 rounded-control border border-border-subtle bg-surface-muted px-3">
                <span class="shrink-0 text-sm text-content-muted">eventoren.de/veranstalter/</span>
                <Input
                  id="onboarding-slug"
                  class="h-10 flex-1 border-0 bg-transparent px-0 text-sm shadow-none"
                  value={state.slug.get()}
                  onInput={(event) => state.setSlug(event.currentTarget.value.toLowerCase())}
                  placeholder="tanzschule-rhythmus"
                  maxlength={60}
                  aria-invalid={errors().slug ? "true" : undefined}
                />
                <span class="ml-2 inline-flex shrink-0 items-center" aria-hidden="true">
                  <Show when={slug().available}>
                    <Icon path={mdiCheckCircleOutline} class="size-4 text-success" />
                  </Show>
                </span>
              </div>
              <Show when={slug().available}>
                <p class="flex items-center gap-1 text-xs text-success">
                  <Icon path={mdiCheckCircleOutline} class="size-3.5" />
                  Verfügbar: eventoren.de/veranstalter/{slug().value}
                </p>
              </Show>
              <Show when={slug().taken}>
                <p class="flex items-center gap-1 text-xs text-danger dark:text-red-300" role="alert">
                  <Icon path={mdiInformationOutline} class="size-3.5" />
                  Dieser Profil-Link ist schon vergeben. Wähl einen anderen.
                </p>
              </Show>
            </div>
          </DashField>
          <DashField
            label="Logo"
            error={errors().logoDataUrl}
            hint="Optional – dein Bild erscheint rund, sonst Initialen."
          >
            <div class="max-w-44">
              <ImageDrop
                value={state.logoDataUrl.get()}
                onChange={(next) => state.set(state.logoDataUrl, next)}
                aspect="square"
                shape="circle"
              />
            </div>
          </DashField>
        </div>
      </DashSection>
    </div>
  )
}
