import { Show } from "solid-js"
import { SegmentedControl } from "#ui/input/segmented/SegmentedControl.jsx"

import type { DashTaxRate } from "../../../model/dashTaxRateSchema.ts"
import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import type { DashSettingsPageState } from "../dashSettingsPageStateCreate.ts"

/** Sektion „Steuern“: Status vom Admin (nur lesen) + Standard-Steuersatz für neue Ticketarten. */
export function DashSettingsSteuern(p: { state: DashSettingsPageState }) {
  const org = () => p.state.org()
  const draft = () => p.state.draft()
  const isKlein = () => org()?.tax.status === "klein"

  return (
    <DashSection id="einstellungen-steuern" title="Steuern" description="Dein Steuerstatus kommt vom Plattform-Admin.">
      <Show when={org() && draft()}>
        <div class="flex flex-col gap-4">
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <span class="text-content-muted">Status:</span>
            <Show
              when={isKlein()}
              fallback={
                <span class="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-content">
                  Regelbesteuerung
                </span>
              }
            >
              <span class="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-content">
                Kleinunternehmer (§ 19 UStG)
              </span>
            </Show>
            <span class="text-xs text-content-muted">vom Plattform-Admin festgelegt</span>
          </div>
          <Show when={!isKlein()}>
            <DashField
              label="Standard-Steuersatz"
              info="Gilt für alle Ticketarten, die du neu anlegst. Bestehende Ticketarten bleiben unverändert."
            >
              <fieldset disabled={p.state.readOnly()} class="min-w-0">
                <SegmentedControl
                  value={String(draft()?.defaultRateBps ?? 1900)}
                  onChange={(value) => p.state.setDraft({ defaultRateBps: Number(value) as DashTaxRate })}
                  options={[
                    { value: "1900", label: "19 %" },
                    { value: "700", label: "7 %" },
                  ]}
                  ariaLabel="Standard-Steuersatz für neue Ticketarten"
                />
              </fieldset>
            </DashField>
          </Show>
          <Show when={isKlein()}>
            <p class="text-sm text-content-muted">
              Als Kleinunternehmer weist du keine Umsatzsteuer aus. Der Standard-Steuersatz ist für dich ausgeblendet.
            </p>
          </Show>
        </div>
      </Show>
    </DashSection>
  )
}
