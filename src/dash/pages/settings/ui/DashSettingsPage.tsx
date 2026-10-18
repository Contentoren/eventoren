import { Show } from "solid-js"
import { StickySaveBar } from "#ui/interactive/savebar/StickySaveBar.jsx"
import type { DashAuditArea } from "../../../model/dashAuditAreaSchema.ts"
import { dashActiveOrg } from "../../../store/dashActiveOrg.ts"
import { dashCan } from "../../../store/dashCan.ts"
import { DashPageHeader } from "../../../ui/DashPageHeader.tsx"
import { DashLockedState } from "../../../ui/locked/DashLockedState.tsx"
import { dashSettingsPageStateCreate } from "../dashSettingsPageStateCreate.ts"
import { DashSettingsAuszahlung } from "./DashSettingsAuszahlung.tsx"
import { DashSettingsGebuehren } from "./DashSettingsGebuehren.tsx"
import { DashSettingsGefahrenzone } from "./DashSettingsGefahrenzone.tsx"
import { DashSettingsGutscheine } from "./DashSettingsGutscheine.tsx"
import { DashSettingsNav } from "./DashSettingsNav.tsx"
import { DashSettingsOrganisation } from "./DashSettingsOrganisation.tsx"
import { DashSettingsProtokoll } from "./DashSettingsProtokoll.tsx"
import { DashSettingsSteuern } from "./DashSettingsSteuern.tsx"
import { DashSettingsVertraege } from "./DashSettingsVertraege.tsx"

/** Einstellungsseite: Organisation, Auszahlung, Steuern, Gebühren, Gutscheine, Verträge, Protokoll, Gefahrenzone. */
export function DashSettingsPage(p: {
  area: DashAuditArea | null
  person: string | null
  onArea: (value: DashAuditArea | null) => void
  onPerson: (value: string | null) => void
}) {
  const state = dashSettingsPageStateCreate()
  const org = () => dashActiveOrg()
  const mayEdit = () => dashCan("einstellungen.bearbeiten")
  const maySee = () => mayEdit() || dashCan("finanzen.sehen")

  return (
    <div>
      <Show
        when={maySee()}
        fallback={
          <div class="flex flex-col gap-6">
            <DashPageHeader title="Einstellungen" description="Steuern, Gebühren und Standards." />
            <DashLockedState description="Du darfst die Einstellungen nur mit Bearbeitungs- oder Finanzrechten ansehen." />
          </div>
        }
      >
        <Show when={!mayEdit()}>
          <div class="mb-4">
            <DashLockedState description="Du darfst die Einstellungen nur ansehen. Bitte ein Teammitglied mit Einstellungsrechten um Änderungen." />
          </div>
        </Show>
        <Show
          when={org()}
          fallback={
            <div class="flex flex-col gap-6">
              <DashPageHeader title="Einstellungen" description="Steuern, Gebühren und Standards." />
              <div class="rounded-card border border-border-subtle bg-surface p-6 text-sm text-content-muted">
                Kein Veranstalter ausgewählt.
              </div>
            </div>
          }
        >
          <div class="flex flex-col gap-6">
            <DashPageHeader title="Einstellungen" description="Organisation, Auszahlung, Steuern, Gebühren und mehr." />
            <div class="grid items-start gap-6 lg:grid-cols-[1fr_200px]">
              <div class="flex min-w-0 flex-col gap-6">
                <DashSettingsOrganisation state={state} />
                <DashSettingsAuszahlung state={state} />
                <DashSettingsSteuern state={state} />
                <DashSettingsGebuehren state={state} />
                <DashSettingsGutscheine state={state} />
                <DashSettingsVertraege state={state} />
                <DashSettingsProtokoll
                  state={state}
                  area={p.area}
                  person={p.person}
                  onArea={p.onArea}
                  onPerson={p.onPerson}
                />
                <DashSettingsGefahrenzone state={state} />
              </div>
              <DashSettingsNav state={state} />
            </div>
          </div>
        </Show>
      </Show>
      <StickySaveBar
        visible={state.dirty() && state.canEdit()}
        onSave={state.save}
        onDiscard={state.discard}
        saving={state.savingSignal.get()}
        message="Ungespeicherte Änderungen an deinen Einstellungen"
      />
    </div>
  )
}
