import { mdiCheckCircleOutline } from "@adaptive-ds/mdi/mdiCheckCircleOutline.js"
import { mdiMenu } from "@adaptive-ds/mdi/mdiMenu.js"
import { Link } from "@tanstack/solid-router"
import { Show } from "solid-js"
import { ButtonIconOnly } from "#ui/interactive/button/ButtonIconOnly.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { Avatar } from "#ui/static/avatar/Avatar.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import type { VeranstalterDashboardShellState } from "./veranstalterDashboardShellStateCreate.ts"

/** Topbar for the Veranstalter dashboard shell with org switch entry. */
export function VeranstalterDashboardTopbar(p: {
  readonly state: VeranstalterDashboardShellState
  readonly onMenuOpen?: () => void
}) {
  return (
    <div class="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border-subtle bg-surface/80 px-4 backdrop-blur lg:px-8">
      <ButtonIconOnly
        icon={mdiMenu}
        variant={buttonVariant.ghost}
        aria-label="Menü öffnen"
        title="Menü öffnen"
        class="lg:hidden"
        onClick={() => p.onMenuOpen?.()}
      />
      <div class="min-w-0 flex-1">
        <Show
          when={p.state.activeOrganization()}
          fallback={<p class="truncate text-sm font-semibold text-content">Veranstalter</p>}
        >
          {(active) => (
            <div class="flex min-w-0 items-center gap-2">
              <Avatar name={active().profile.name} size="sm" shape="rounded" />
              <p class="truncate text-sm font-semibold text-content">{active().profile.name}</p>
              <Show when={p.state.roleLabel()}>
                {(role) => <span class="hidden shrink-0 text-xs text-content-muted sm:inline">{role()}</span>}
              </Show>
            </div>
          )}
        </Show>
      </div>
      <Show when={p.state.statusLabel()}>
        {(status) => (
          <span class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border-subtle px-2.5 py-0.5 text-xs text-content-muted">
            <Icon path={mdiCheckCircleOutline} class="size-3.5" />
            {status()}
          </span>
        )}
      </Show>
      <Link
        to="/veranstalter"
        search={{}}
        class="shrink-0 rounded-control px-2.5 py-1.5 text-xs font-medium text-content-muted transition-colors hover:bg-surface-muted hover:text-content"
      >
        Organisation wechseln
      </Link>
    </div>
  )
}
