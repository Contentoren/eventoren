import { mdiAccountGroupOutline } from "@adaptive-ds/mdi/mdiAccountGroupOutline.js"
import { mdiAccountPlusOutline } from "@adaptive-ds/mdi/mdiAccountPlusOutline.js"
import { mdiCalendarOutline } from "@adaptive-ds/mdi/mdiCalendarOutline.js"
import { mdiCogOutline } from "@adaptive-ds/mdi/mdiCogOutline.js"
import { mdiDomainPlus } from "@adaptive-ds/mdi/mdiDomainPlus.js"
import { mdiReceiptTextOutline } from "@adaptive-ds/mdi/mdiReceiptTextOutline.js"
import { mdiViewDashboardOutline } from "@adaptive-ds/mdi/mdiViewDashboardOutline.js"
import { Link } from "@tanstack/solid-router"
import { Show } from "solid-js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { classMerge } from "#ui/utils/classMerge.js"

const itemClass = (active: boolean) =>
  classMerge(
    "flex h-9 items-center gap-2.5 rounded-control px-2.5 text-sm transition-colors",
    active
      ? "bg-surface-muted font-medium text-content"
      : "text-content-muted hover:bg-surface-muted/60 hover:text-content",
  )

/** Shared desktop/mobile navigation; backend authorization remains authoritative. */
export function VeranstalterDashboardSidebar(p: {
  readonly currentPath: () => string
  readonly orgId: () => string | undefined
  readonly canManageTeam: () => boolean
  readonly canReadOrders: () => boolean
}) {
  const path = () => p.currentPath()
  const search = () => (p.orgId() ? { org: p.orgId() } : {})
  return (
    <div class="flex h-full min-h-0 flex-col">
      <div class="p-3">
        <p class="rounded-control px-2 py-1.5 text-sm font-semibold text-content">Veranstalter</p>
      </div>
      <nav aria-label="Veranstalter-Navigation" class="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <ul class="flex flex-col gap-0.5">
          <li>
            <Link
              to="/veranstalter"
              search={search()}
              aria-current={path() === "/veranstalter" ? "page" : undefined}
              class={itemClass(path() === "/veranstalter")}
            >
              <Icon path={mdiViewDashboardOutline} class="size-4 shrink-0" />
              Übersicht
            </Link>
          </li>
          <li>
            <Link
              to="/veranstalter/events"
              search={search()}
              aria-current={path() === "/veranstalter/events" ? "page" : undefined}
              class={itemClass(path() === "/veranstalter/events")}
            >
              <Icon path={mdiCalendarOutline} class="size-4 shrink-0" />
              Events
            </Link>
          </li>
          <Show when={p.canReadOrders()}>
            <li>
              <Link
                to="/veranstalter/bestellungen"
                search={search()}
                aria-current={path() === "/veranstalter/bestellungen" ? "page" : undefined}
                class={itemClass(path() === "/veranstalter/bestellungen")}
              >
                <Icon path={mdiReceiptTextOutline} class="size-4 shrink-0" />
                Bestellungen
              </Link>
            </li>
          </Show>
          <Show when={p.canManageTeam()}>
            <li>
              <Link
                to="/veranstalter/team"
                search={search()}
                aria-current={path() === "/veranstalter/team" ? "page" : undefined}
                class={itemClass(path() === "/veranstalter/team")}
              >
                <Icon path={mdiAccountGroupOutline} class="size-4 shrink-0" />
                Team
              </Link>
            </li>
          </Show>
          <li>
            <Link
              to="/veranstalter/einstellungen"
              search={search()}
              aria-current={path() === "/veranstalter/einstellungen" ? "page" : undefined}
              class={itemClass(path() === "/veranstalter/einstellungen")}
            >
              <Icon path={mdiCogOutline} class="size-4 shrink-0" />
              Einstellungen
            </Link>
          </li>
        </ul>
        <p class="px-2 pb-1 pt-4 text-xs font-medium text-content-muted">Organisation</p>
        <ul class="flex flex-col gap-0.5">
          <li>
            <Link
              to="/veranstalter-einladungen"
              aria-current={path() === "/veranstalter-einladungen" ? "page" : undefined}
              class={itemClass(path() === "/veranstalter-einladungen")}
            >
              <Icon path={mdiAccountPlusOutline} class="size-4 shrink-0" />
              Meine Einladungen
            </Link>
          </li>
          <li>
            <Link
              to="/veranstalter/onboarding"
              aria-current={path() === "/veranstalter/onboarding" ? "page" : undefined}
              class={itemClass(path() === "/veranstalter/onboarding")}
            >
              <Icon path={mdiDomainPlus} class="size-4 shrink-0" />
              Veranstalter registrieren
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  )
}
