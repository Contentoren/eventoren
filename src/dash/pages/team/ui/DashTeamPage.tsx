import { Show } from "solid-js"
import { mdiPlus } from "@adaptive-ds/mdi/mdiPlus.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ConfirmDialog } from "#ui/interactive/dialog/ConfirmDialog.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"

import { dashActiveOrg } from "../../../store/dashActiveOrg.ts"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import { DashLockedState } from "../../../ui/locked/DashLockedState.tsx"
import { dashTeamInviteStateCreate } from "../model/dashTeamInviteStateCreate.ts"
import type { DashTeamPageState } from "../dashTeamPageStateCreate.ts"
import { DashTeamInviteSheet } from "./DashTeamInviteSheet.tsx"
import { DashTeamMatrix } from "./DashTeamMatrix.tsx"
import { DashTeamScannerHint } from "./DashTeamScannerHint.tsx"
import { DashTeamTable } from "./DashTeamTable.tsx"

/** Teamseite: Tabelle, Einladen-Sheet, Rollen-Matrix und Einlass-Hinweis. */
export function DashTeamPage(p: { state: DashTeamPageState; inviteRequested: boolean }) {
  const orgId = () => dashActiveOrg()?.id ?? null
  const invite = dashTeamInviteStateCreate(orgId, () => p.state.inviteOpen.set(false))
  const sheetOpen = () => p.state.inviteOpen.get() || p.inviteRequested

  return (
    <div class="flex flex-col gap-6">
      <Show when={!p.state.canManage()}>
        <DashLockedState description="Du darfst das Team nur ansehen. Bitte ein Mitglied mit Teamrechten um Änderungen." />
      </Show>
      <DashSection
        title={`Team · ${p.state.members().length} ${p.state.members().length === 1 ? "Mitglied" : "Mitglieder"}`}
        actions={
          <Show when={p.state.canManage()}>
            <Button
              type="button"
              variant="contrast"
              class="h-9 gap-1.5 px-3 text-sm"
              onClick={() => p.state.inviteOpen.set(true)}
            >
              <Icon path={mdiPlus} class="size-4" />
              Mitglied einladen
            </Button>
          </Show>
        }
      >
        <DashTeamTable state={p.state} />
      </DashSection>
      <DashTeamMatrix />
      <DashTeamScannerHint />
      <DashTeamInviteSheet open={sheetOpen()} onClose={() => p.state.inviteOpen.set(false)} state={invite} />
      <ConfirmDialog
        open={p.state.removeTarget.get() !== null}
        onOpenChange={(open) => {
          if (!open) p.state.removeTarget.set(null)
        }}
        title={`„${p.state.removeTarget.get()?.name ?? ""}“ entfernen?`}
        description={`${p.state.removeTarget.get()?.name ?? "Dieses Mitglied"} verliert sofort den Zugriff.`}
        confirmLabel="Entfernen"
        tone="danger"
        onConfirm={() => p.state.confirmRemove()}
      />
    </div>
  )
}
