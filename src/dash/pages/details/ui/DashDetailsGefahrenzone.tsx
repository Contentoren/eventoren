import { mdiCancel } from "@adaptive-ds/mdi/mdiCancel.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { Icon } from "#ui/static/icon/Icon.jsx"

import type { DashDetailsPageState } from "../dashDetailsPageStateCreate.ts"

/** Gefahrenzone: Event absagen über den Dialog-Host der Event-Seite. */
export function DashDetailsGefahrenzone(p: { state: DashDetailsPageState }) {
  const disabled = () => !p.state.canEdit()

  return (
    <section aria-label="Gefahrenzone" class="rounded-card border border-danger/40 bg-surface p-4 sm:p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="min-w-0">
          <h2 class="text-sm font-semibold text-content">Gefahrenzone</h2>
          <p class="mt-0.5 text-sm text-content-muted">
            Sage dein Event ab — deine Gäste erhalten eine Nachricht mit Erstattung.
          </p>
        </div>
        <Button
          type="button"
          variant={buttonVariant.outlineRed}
          class="h-9 px-3 text-sm"
          disabled={disabled()}
          onClick={p.state.openCancel}
        >
          <Icon path={mdiCancel} class="size-4" />
          Event absagen
        </Button>
      </div>
    </section>
  )
}
