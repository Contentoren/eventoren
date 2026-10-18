import { mdiKeyOutline } from "@adaptive-ds/mdi/mdiKeyOutline.js"
import { mdiTrashCanOutline } from "@adaptive-ds/mdi/mdiTrashCanOutline.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { Icon } from "#ui/static/icon/Icon.jsx"

function demoBlocked(): void {
  toastAdd({ title: "In der Demo nicht möglich", variant: "info" })
}

export function DashAccountProfile() {
  return (
    <div class="flex flex-col gap-4">
      <section aria-label="Deine Daten" class="rounded-card border border-border-subtle bg-surface p-4 sm:p-5">
        <h2 class="text-sm font-semibold">Deine Daten</h2>
        <dl class="mt-3 grid gap-3 sm:grid-cols-2">
          <div class="rounded-control border border-border-subtle bg-surface-muted px-3 py-2">
            <dt class="text-xs text-content-muted">Name</dt>
            <dd class="font-medium">Lea Schneider</dd>
          </div>
          <div class="rounded-control border border-border-subtle bg-surface-muted px-3 py-2">
            <dt class="text-xs text-content-muted">E-Mail</dt>
            <dd class="font-medium">lea.schneider@example.de</dd>
          </div>
        </dl>
        <p class="mt-3 text-sm text-content-muted">
          Deine Daten pflegt der Veranstalter beim Kauf. Wende dich bei Änderungen an den Support.
        </p>
      </section>
      <section aria-label="Kontoaktionen" class="flex flex-wrap gap-2">
        <Button type="button" variant="outline" class="h-9 px-3 text-sm" onClick={demoBlocked}>
          <Icon path={mdiKeyOutline} class="size-4" />
          Passwort ändern
        </Button>
        <Button type="button" variant="outline" class="h-9 px-3 text-sm" onClick={demoBlocked}>
          <Icon path={mdiTrashCanOutline} class="size-4" />
          Konto löschen
        </Button>
      </section>
    </div>
  )
}
