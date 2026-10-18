import { Show } from "solid-js"
import { mdiCheckCircleOutline } from "@adaptive-ds/mdi/mdiCheckCircleOutline.js"
import { mdiPartyPopper } from "@adaptive-ds/mdi/mdiPartyPopper.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"

import { DashStatusPill } from "../../../ui/status/DashStatusPill.tsx"
import { DashOrgLogo } from "../../../ui/org/DashOrgLogo.tsx"
import type { DashOnboardingPageState } from "../dashOnboardingPageStateCreate.ts"

/** Schritt 5 „Fertig“: Willkommen, Prüfstatus und nächste Schritte. */
export function DashOnboardingStepDone(p: { state: DashOnboardingPageState }) {
  const state = p.state
  const org = () => state.createdOrg()

  return (
    <div class="flex flex-col items-center gap-5 rounded-card border border-border-subtle bg-surface px-5 py-8 text-center sm:px-8">
      <Show
        when={org()}
        fallback={
          <span class="inline-flex size-16 items-center justify-center rounded-full bg-success/10 text-success">
            <Icon path={mdiCheckCircleOutline} class="size-9" />
          </span>
        }
      >
        {(current) => <DashOrgLogo name={current().name} logoDataUrl={current().logoDataUrl} size="xl" />}
      </Show>
      <div class="flex flex-col items-center gap-2">
        <p class="inline-flex items-center gap-1.5 text-sm font-medium text-content-muted">
          <Icon path={mdiPartyPopper} class="size-4" />
          Geschafft!
        </p>
        <h2 class="text-xl font-semibold text-content">Willkommen, {org()?.name ?? "lieber Veranstalter"}!</h2>
        <DashStatusPill kind="org" value="pruefung" />
        <p class="max-w-sm text-sm text-content-muted">
          In Prüfung – du kannst schon Events vorbereiten. Sobald wir dein Profil freigeben, kannst du veröffentlichen.
        </p>
      </div>
      <Show when={org()}>
        {(current) => (
          <p class="text-xs text-content-muted">Dein Profil-Link: eventoren.de/veranstalter/{current().slug}</p>
        )}
      </Show>
      <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <LinkButtonInternal
          to="/demo/dashboard/events/neu"
          variant={buttonVariant.contrast}
          class="h-10 justify-center px-4 text-sm"
        >
          Erstes Event erstellen
        </LinkButtonInternal>
        <Button
          type="button"
          variant={buttonVariant.outline}
          class="h-10 justify-center px-4 text-sm"
          onClick={state.openDashboard}
        >
          Zum Dashboard
        </Button>
      </div>
    </div>
  )
}
