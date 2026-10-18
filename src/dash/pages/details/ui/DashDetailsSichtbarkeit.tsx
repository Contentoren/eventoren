import { Show } from "solid-js"
import { SegmentedControl } from "#ui/input/segmented/SegmentedControl.jsx"
import { ToggleSwitch } from "#ui/input/toggle/ToggleSwitch.jsx"

import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import type { DashDetailsPageState } from "../dashDetailsPageStateCreate.ts"

/** Sektion „Sichtbarkeit“: öffentliche oder nicht gelistete Anzeige plus Verkaufspause. */
export function DashDetailsSichtbarkeit(p: { state: DashDetailsPageState }) {
  const draft = () => p.state.draft()
  const disabled = () => !p.state.canEdit()

  return (
    <DashSection
      id="details-sichtbarkeit"
      title="Sichtbarkeit"
      description="Wer darf dein Event sehen und kaufen?"
      class="scroll-mt-24"
    >
      <div class="flex flex-col gap-4">
        <DashField
          label="Sichtbarkeit"
          info="Nicht gelistete Events erreichst du nur mit dem direkten Link — sie tauchen nicht in der Suche auf."
        >
          <Show
            when={!disabled()}
            fallback={
              <p class="text-sm text-content">
                {draft()?.visibility === "nicht-gelistet" ? "Nicht gelistet" : "Öffentlich"}
              </p>
            }
          >
            <SegmentedControl
              value={draft()?.visibility ?? "oeffentlich"}
              onChange={(value) =>
                p.state.setDraft({ visibility: value === "nicht-gelistet" ? "nicht-gelistet" : "oeffentlich" })
              }
              ariaLabel="Sichtbarkeit wählen"
              options={[
                { value: "oeffentlich", label: "Öffentlich" },
                { value: "nicht-gelistet", label: "Nicht gelistet" },
              ]}
            />
          </Show>
        </DashField>
        <DashField label="Verkauf" hint="Pausiere den Verkauf, ohne dein Event offline zu nehmen.">
          <ToggleSwitch
            checked={draft()?.salesPaused ?? false}
            onChange={(checked) => p.state.setDraft({ salesPaused: checked })}
            label={draft()?.salesPaused ? "Verkauf pausiert" : "Verkauf läuft"}
            disabled={disabled()}
          />
        </DashField>
      </div>
    </DashSection>
  )
}
