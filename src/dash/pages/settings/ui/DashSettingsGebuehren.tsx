import { dashCentsFormat } from "../../../model/dashCentsFormat.ts"
import { DashDescriptionList } from "../../../ui/layout/DashDescriptionList.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import type { DashSettingsPageState } from "../dashSettingsPageStateCreate.ts"

/** Sektion „Gebühren“: Gebührenmodell nur lesen, mit Beispielrechnung. */
export function DashSettingsGebuehren(p: { state: DashSettingsPageState }) {
  const org = () => p.state.org()

  return (
    <DashSection
      id="einstellungen-gebuehren"
      title="Gebühren"
      description="Unser Gebührenmodell — transparent und unveränderbar."
    >
      <DashDescriptionList
        items={[
          {
            label: "Gebühr je Ticket",
            value: `5 % + ${dashCentsFormat(org()?.fee.fixedCents ?? 49)} · trägt der Käufer`,
          },
          {
            label: "Beispiel",
            value: `Ticket ${dashCentsFormat(2000)} → Käufer zahlt ${dashCentsFormat(2149)}, du erhältst ${dashCentsFormat(2000)}.`,
          },
        ]}
      />
    </DashSection>
  )
}
