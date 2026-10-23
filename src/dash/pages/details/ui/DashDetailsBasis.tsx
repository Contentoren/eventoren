import { mdiBookOpen } from "@adaptive-ds/mdi/mdiBookOpen.js"
import { mdiMusic } from "@adaptive-ds/mdi/mdiMusic.js"
import { mdiPalette } from "@adaptive-ds/mdi/mdiPalette.js"
import { mdiPartyPopper } from "@adaptive-ds/mdi/mdiPartyPopper.js"
import { mdiSchool } from "@adaptive-ds/mdi/mdiSchool.js"
import { mdiTag } from "@adaptive-ds/mdi/mdiTag.js"
import { mdiTent } from "@adaptive-ds/mdi/mdiTent.js"
import { mdiTrophy } from "@adaptive-ds/mdi/mdiTrophy.js"
import { cn } from "cn"
import { For, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { FilterChip } from "#ui/interactive/chip/FilterChip.jsx"

import type { DashEventCategory } from "../../../model/dashEventCategorySchema.ts"
import { DashDateTimeInput } from "../../../ui/form/DashDateTimeInput.tsx"
import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import { dashEventCategoryLabel } from "../../events/model/dashEventListFilter.ts"
import type { DashDetailsPageState } from "../dashDetailsPageStateCreate.ts"

const categoryIcons: Record<DashEventCategory, string> = {
  konzert: mdiMusic,
  party: mdiPartyPopper,
  abiball: mdiSchool,
  kurs: mdiBookOpen,
  kultur: mdiPalette,
  sport: mdiTrophy,
  festival: mdiTent,
  sonstiges: mdiTag,
}

const categoryOrder: DashEventCategory[] = [
  "konzert",
  "party",
  "abiball",
  "kurs",
  "kultur",
  "sport",
  "festival",
  "sonstiges",
]

/** Sektion „Basis“: Titel, Untertitel, Kategorie, Beginn, Ende und Einlass. */
export function DashDetailsBasis(p: { state: DashDetailsPageState }) {
  const draft = () => p.state.draft()
  const disabled = () => !p.state.canEdit()
  const showErrors = () => p.state.showErrorsSignal.get()
  const errors = () => p.state.errors()

  return (
    <DashSection
      id="details-basis"
      title="Basis"
      description="Titel, Kategorie und Zeiten deines Events."
      class="scroll-mt-24"
    >
      <div class="flex flex-col gap-4">
        <DashField label="Titel" for="details-title" required error={showErrors() ? errors()?.title : null}>
          <Input
            id="details-title"
            value={draft()?.title ?? ""}
            placeholder="Gib deinem Event einen Namen"
            maxLength={120}
            disabled={disabled()}
            aria-invalid={showErrors() && errors()?.title ? "true" : undefined}
            class={cn("h-10 text-sm rounded-control", showErrors() && errors()?.title && "border-danger")}
            onInput={(event) => p.state.setDraft({ title: event.currentTarget.value })}
          />
        </DashField>
        <DashField label="Untertitel" for="details-subtitle" hint="Ein kurzer Zusatz unter deinem Titel.">
          <Input
            id="details-subtitle"
            value={draft()?.subtitle ?? ""}
            placeholder="z. B. Open Air am See"
            maxLength={120}
            disabled={disabled()}
            class="h-10 text-sm rounded-control"
            onInput={(event) => p.state.setDraft({ subtitle: event.currentTarget.value })}
          />
        </DashField>
        <DashField label="Kategorie">
          <div class="flex flex-wrap gap-2" role="group" aria-label="Kategorie wählen">
            <For each={categoryOrder}>
              {(category) => (
                <Show
                  when={!disabled()}
                  fallback={
                    <span
                      aria-current={draft()?.category === category ? "true" : undefined}
                      class={cn(
                        "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium",
                        draft()?.category === category
                          ? "border-brand bg-brand-soft text-brand-accent"
                          : "border-border-subtle bg-surface text-content-muted",
                      )}
                    >
                      {dashEventCategoryLabel(category)}
                    </span>
                  }
                >
                  <FilterChip
                    active={draft()?.category === category}
                    onClick={() => p.state.setCategory(category)}
                    icon={categoryIcons[category]}
                  >
                    {dashEventCategoryLabel(category)}
                  </FilterChip>
                </Show>
              )}
            </For>
          </div>
        </DashField>
        <div class="grid gap-4 sm:grid-cols-3">
          <DashField label="Beginn" for="details-starts" required>
            <DashDateTimeInput
              id="details-starts"
              valueIso={draft()?.startsAt ?? null}
              onChange={(iso) => p.state.setDraft({ startsAt: iso })}
              disabled={disabled()}
              invalid={showErrors() && errors()?.timing !== null}
            />
          </DashField>
          <DashField label="Ende" for="details-ends" required error={showErrors() ? errors()?.timing : null}>
            <DashDateTimeInput
              id="details-ends"
              valueIso={draft()?.endsAt ?? null}
              onChange={(iso) => p.state.setDraft({ endsAt: iso })}
              min={draft()?.startsAt}
              disabled={disabled()}
              invalid={showErrors() && errors()?.timing !== null}
            />
          </DashField>
          <DashField label="Einlass" for="details-doors" error={showErrors() ? errors()?.doors : null}>
            <div class="flex flex-col gap-2">
              <DashDateTimeInput
                id="details-doors"
                valueIso={draft()?.doorsAt ?? null}
                onChange={(iso) => p.state.setDraft({ doorsAt: iso })}
                disabled={disabled()}
                invalid={showErrors() && errors()?.doors !== null}
              />
              <div>
                <Button
                  type="button"
                  variant={buttonVariant.ghost}
                  class="h-9 px-3 text-sm"
                  disabled={disabled() || !draft()?.startsAt}
                  onClick={() => p.state.shiftDoors(30)}
                >
                  30 Min. vorher
                </Button>
              </div>
            </div>
          </DashField>
        </div>
        <p class="text-xs text-content-muted">Alle Zeiten gelten für Europe/Berlin.</p>
      </div>
    </DashSection>
  )
}
