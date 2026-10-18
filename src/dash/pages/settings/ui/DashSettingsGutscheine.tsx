import { Show } from "solid-js"
import { SegmentedControl } from "#ui/input/segmented/SegmentedControl.jsx"

import type { DashOrgVoucherValidity } from "../../../model/dashOrgVoucherValiditySchema.ts"
import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import type { DashSettingsPageState } from "../dashSettingsPageStateCreate.ts"

const validityOptions: { value: DashOrgVoucherValidity; label: string }[] = [
  { value: "1-jahr", label: "1 Jahr" },
  { value: "2-jahre", label: "2 Jahre" },
  { value: "3-jahre-jahresende", label: "3 Jahre zum Jahresende" },
  { value: "unbegrenzt", label: "Unbegrenzt" },
]

/** Sektion „Gutscheine“: Standard-Laufzeit für neu ausgestellte Gutscheine. */
export function DashSettingsGutscheine(p: { state: DashSettingsPageState }) {
  const draft = () => p.state.draft()

  return (
    <DashSection
      id="einstellungen-gutscheine"
      title="Gutscheine"
      description="Diese Laufzeit schlagen wir dir vor, wenn du einen neuen Gutschein erstellst."
    >
      <Show when={draft()}>
        {(current) => (
          <DashField label="Standard-Laufzeit">
            <fieldset disabled={p.state.readOnly()} class="min-w-0">
              <SegmentedControl
                value={current().voucherDefaultValidity}
                onChange={(value) => p.state.setDraft({ voucherDefaultValidity: value as DashOrgVoucherValidity })}
                options={validityOptions}
                ariaLabel="Standard-Laufzeit für neue Gutscheine"
              />
            </fieldset>
          </DashField>
        )}
      </Show>
    </DashSection>
  )
}
