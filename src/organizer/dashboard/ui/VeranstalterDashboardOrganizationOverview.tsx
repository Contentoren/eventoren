import { mdiCheckCircleOutline } from "@adaptive-ds/mdi/mdiCheckCircleOutline.js"
import { mdiDomain } from "@adaptive-ds/mdi/mdiDomain.js"
import { Show } from "solid-js"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import type { VeranstalterDashboardShellState } from "./veranstalterDashboardShellStateCreate.ts"

/** Overview of the active organisation with its real Convex context data. */
export function VeranstalterDashboardOrganizationOverview(p: { readonly state: VeranstalterDashboardShellState }) {
  return (
    <Show
      when={p.state.activeOrganization()}
      fallback={
        <EmptyState
          icon={mdiDomain}
          title="Organisation wird geladen"
          description="Die Organisationsdaten werden synchronisiert."
        />
      }
    >
      {(active) => (
        <section aria-labelledby="veranstalter-uebersicht" class="flex flex-col gap-4">
          <header class="flex flex-col gap-1">
            <h1 id="veranstalter-uebersicht" class="text-xl font-semibold tracking-tight text-content sm:text-2xl">
              {active().profile.name}
            </h1>
            <p class="text-sm text-content-muted">
              {p.state.roleLabel()} · {p.state.statusLabel()}
            </p>
          </header>
          <Show when={p.state.roleDescription()}>
            {(description) => <p class="max-w-2xl text-sm text-content-muted">{description()}</p>}
          </Show>
          <dl class="grid gap-3 sm:grid-cols-3">
            <div>
              <dt class="text-xs font-medium text-content-muted">Rolle</dt>
              <dd class="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-content">
                <Icon path={mdiCheckCircleOutline} class="size-4" />
                {p.state.roleLabel()}
              </dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-content-muted">Status</dt>
              <dd class="mt-0.5 text-sm font-medium text-content">{p.state.statusLabel()}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-content-muted">Kurzname</dt>
              <dd class="mt-0.5 text-sm font-medium text-content">{active().profile.slug}</dd>
            </div>
          </dl>
        </section>
      )}
    </Show>
  )
}
