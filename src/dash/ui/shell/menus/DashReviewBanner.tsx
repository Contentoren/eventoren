import { mdiShieldAlert } from "@adaptive-ds/mdi/mdiShieldAlert.js"
import { mdiShieldSearch } from "@adaptive-ds/mdi/mdiShieldSearch.js"
import { Link } from "@tanstack/solid-router"
import { Match, Switch } from "solid-js"
import { dashActiveOrg } from "#src/dash/store/dashActiveOrg.ts"
import { Icon } from "#ui/static/icon/Icon.jsx"

/** Amber Prüf-Banner bzw. rotes Sperr-Banner im `banner`-Slot der Shell. */
export function DashReviewBanner() {
  const org = () => dashActiveOrg()
  return (
    <Switch>
      <Match when={org()?.status === "pruefung"}>
        <div
          role="status"
          class="mb-4 flex items-center gap-2.5 rounded-card border border-border-subtle bg-warning-soft px-4 py-2.5 text-sm text-warning dark:bg-amber-950/40 dark:text-amber-300"
        >
          <Icon path={mdiShieldSearch} class="size-4 shrink-0" />
          <p class="min-w-0 flex-1">Deine Organisation wird geprüft. Veröffentlichen ist danach möglich.</p>
          <Link
            to="/demo/dashboard/einstellungen"
            class="shrink-0 font-medium underline underline-offset-2 hover:no-underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Details
          </Link>
        </div>
      </Match>
      <Match when={org()?.status === "gesperrt"}>
        <div
          role="alert"
          class="mb-4 flex items-center gap-2.5 rounded-card border border-border-subtle bg-danger-soft px-4 py-2.5 text-sm text-danger dark:bg-red-950/40 dark:text-red-300"
        >
          <Icon path={mdiShieldAlert} class="size-4 shrink-0" />
          <p class="min-w-0 flex-1">
            Deine Organisation ist gesperrt{org()?.statusReason ? `: ${org()?.statusReason}` : "."}
          </p>
        </div>
      </Match>
    </Switch>
  )
}
