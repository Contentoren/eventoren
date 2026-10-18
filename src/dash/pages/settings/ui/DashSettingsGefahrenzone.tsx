import { mdiDeleteOutline } from "@adaptive-ds/mdi/mdiDeleteOutline.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { ConfirmDialog } from "#ui/interactive/dialog/ConfirmDialog.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"

import type { DashSettingsPageState } from "../dashSettingsPageStateCreate.ts"

/** Gefahrenzone: Organisation löschen — in der Demo nur mit Bestätigung und Toast. */
export function DashSettingsGefahrenzone(p: { state: DashSettingsPageState }) {
  const org = () => p.state.org()
  const disabled = () => p.state.readOnly()

  return (
    <section aria-label="Gefahrenzone" class="rounded-card border border-danger/40 bg-surface p-4 sm:p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="min-w-0">
          <h2 class="text-sm font-semibold text-content">Gefahrenzone</h2>
          <p class="mt-0.5 text-sm text-content-muted">
            Lösche deine Organisation mit allen Events, Tickets und Gutscheinen. Das lässt sich nicht rückgängig machen.
          </p>
        </div>
        <Button
          type="button"
          variant={buttonVariant.outlineRed}
          class="h-9 px-3 text-sm"
          disabled={disabled()}
          onClick={p.state.openDanger}
        >
          <Icon path={mdiDeleteOutline} class="size-4" />
          Organisation löschen
        </Button>
      </div>
      <ConfirmDialog
        open={p.state.dangerSignal.get()}
        onOpenChange={(open) => {
          if (!open) p.state.closeDanger()
        }}
        title="Organisation wirklich löschen?"
        description="Alle Events, Bestellungen und Gutscheine gehen verloren. Tippe den Organisationsnamen ein, um zu bestätigen."
        confirmLabel="Endgültig löschen"
        tone="danger"
        requireText={org()?.name ?? ""}
        onConfirm={p.state.confirmDanger}
      />
    </section>
  )
}
