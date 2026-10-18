import { For, Show } from "solid-js"
import { mdiAlertOutline } from "@adaptive-ds/mdi/mdiAlertOutline.js"
import { mdiCheckCircle } from "@adaptive-ds/mdi/mdiCheckCircle.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { SegmentedControl } from "#ui/input/segmented/SegmentedControl.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import { dashCentsFormat } from "../../../model/dashCentsFormat.ts"
import type { DashWizardPageState } from "../dashWizardPageStateCreate.ts"

/** Schritt 3 „Prüfen“: Checkliste, Sichtbarkeit und Veröffentlichen. */
export function DashWizardStepReview(p: { state: DashWizardPageState }) {
  const state = p.state

  return (
    <div class="flex flex-col gap-4">
      <DashSection title="Checkliste" description="Grün ist bereit, Amber braucht noch Liebe.">
        <ul class="flex flex-col gap-2">
          <For each={state.checklist()}>
            {(item) => (
              <li class="flex items-center gap-2.5 text-sm">
                <Show
                  when={item.done}
                  fallback={<Icon path={mdiAlertOutline} class="size-5 shrink-0 text-warning dark:text-amber-300" />}
                >
                  <Icon path={mdiCheckCircle} class="size-5 shrink-0 text-success" />
                </Show>
                <span class={item.done ? "text-content" : item.required ? "text-content" : "text-content-muted"}>
                  {item.label}
                  <Show when={!item.done && !item.required}>
                    <span class="text-content-muted"> — später ergänzen</span>
                  </Show>
                </span>
              </li>
            )}
          </For>
        </ul>
      </DashSection>

      <DashSection title="Sichtbarkeit" description="Wer darf dein Event sehen?">
        <DashField label="Sichtbarkeit">
          <SegmentedControl
            value={state.visibility.get()}
            onChange={(value) => {
              state.visibility.set(value === "nicht-gelistet" ? "nicht-gelistet" : "oeffentlich")
              state.markDirty()
            }}
            options={[
              { value: "oeffentlich", label: "Öffentlich" },
              { value: "nicht-gelistet", label: "Nicht gelistet" },
            ]}
            ariaLabel="Sichtbarkeit wählen"
          />
        </DashField>
      </DashSection>

      <DashSection title="Tickets im Überblick" description="Endpreise aus Sicht deiner Gäste.">
        <ul class="flex flex-col gap-2 text-sm">
          <For each={state.tickets.get()}>
            {(row) => (
              <li class="flex flex-wrap items-baseline justify-between gap-2">
                <span class="text-content">{row.name || "Ticketart"}</span>
                <span class="text-content-muted">
                  {dashCentsFormat(row.phases[0]?.priceCents ?? row.priceCents)} ·{" "}
                  {state.feeLine(row.phases[0]?.priceCents ?? row.priceCents)}
                </span>
              </li>
            )}
          </For>
        </ul>
      </DashSection>

      <div class="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={buttonVariant.contrast}
          class="h-9 px-3 text-sm"
          disabled={state.saving.get()}
          onClick={state.publish}
        >
          {state.saving.get() ? "Wird veröffentlicht …" : "Veröffentlichen"}
        </Button>
        <Button
          type="button"
          variant={buttonVariant.outline}
          class="h-9 px-3 text-sm"
          disabled={state.saving.get()}
          onClick={state.saveDraft}
        >
          Als Entwurf speichern
        </Button>
      </div>
    </div>
  )
}
