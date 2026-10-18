import { Show } from "solid-js"

import { StickySaveBar } from "#ui/interactive/savebar/StickySaveBar.jsx"
import { DashLockedState } from "../../../ui/locked/DashLockedState.tsx"
import type { DashProfilePageState } from "../dashProfilePageStateCreate.ts"
import { DashProfileAbout } from "./DashProfileAbout.tsx"
import { DashProfileBasics } from "./DashProfileBasics.tsx"
import { DashProfileContact } from "./DashProfileContact.tsx"
import { DashProfileImprint } from "./DashProfileImprint.tsx"
import { DashProfileLink } from "./DashProfileLink.tsx"
import { DashProfilePreview } from "./DashProfilePreview.tsx"
import { DashProfileSocials } from "./DashProfileSocials.tsx"

/** Profilseite: Formular links, klebrige Live-Vorschau rechts. */
export function DashProfilePage(p: { state: DashProfilePageState }) {
  const org = () => p.state.org()
  const disabled = () => !p.state.canEdit()
  return (
    <div>
      <Show when={!p.state.canEdit()}>
        <div class="mb-4">
          <DashLockedState description="Du darfst das Profil nur ansehen. Bitte ein Teammitglied mit Profilrechten um Änderungen." />
        </div>
      </Show>
      <Show
        when={org()}
        fallback={
          <div class="rounded-card border border-border-subtle bg-surface p-6 text-sm text-content-muted">
            Kein Veranstalter ausgewählt.
          </div>
        }
      >
        <div class="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div class="flex min-w-0 flex-col gap-6">
            <fieldset disabled={disabled()} class="contents">
              <DashProfileBasics state={p.state} disabled={disabled()} />
              <DashProfileAbout state={p.state} disabled={disabled()} />
              <DashProfileContact state={p.state} disabled={disabled()} />
              <DashProfileSocials state={p.state} disabled={disabled()} />
              <DashProfileLink state={p.state} disabled={disabled()} />
              <DashProfileImprint state={p.state} disabled={disabled()} />
            </fieldset>
          </div>
          <DashProfilePreview state={p.state} />
        </div>
      </Show>
      <StickySaveBar
        visible={p.state.dirty() && p.state.canEdit()}
        onSave={() => p.state.save()}
        onDiscard={() => p.state.discard()}
        saving={p.state.saving.get()}
        error={p.state.saveError.get()}
      />
    </div>
  )
}
