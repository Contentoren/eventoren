import { mdiCheckCircleOutline } from "@adaptive-ds/mdi/mdiCheckCircleOutline.js"
import { mdiDomain } from "@adaptive-ds/mdi/mdiDomain.js"
import { Show } from "solid-js"
import { SegmentedControl } from "#ui/input/segmented/SegmentedControl.jsx"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { veranstalterDashboardOverviewKpisStateCreate } from "../overview/veranstalterDashboardOverviewKpisStateCreate.ts"
import { VeranstalterDashboardOverviewKpis } from "../overview/ui/VeranstalterDashboardOverviewKpis.tsx"
import type { VeranstalterDashboardShellState } from "./veranstalterDashboardShellStateCreate.ts"

/** Overview of the active organisation with live KPIs from the same Convex data as finance. */
export function VeranstalterDashboardOrganizationOverview(p: { readonly state: VeranstalterDashboardShellState }) {
  const range = createSignalObject<"7" | "30" | "365">("30")
  const kpis = veranstalterDashboardOverviewKpisStateCreate({
    orgId: () => p.state.activeOrganization()?.id,
    canRead: () => p.state.activeOrganization()?.permissions.includes("umsatz.sehen") ?? false,
    range: () => range.get(),
  })
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
          <Show when={p.state.activeOrganization()?.permissions.includes("umsatz.sehen") ?? false}>
            <section aria-label="Kennzahlen" class="rounded-card border border-border-subtle bg-surface p-4 sm:p-5">
              <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 class="text-sm font-semibold text-content">Kennzahlen</h2>
                <SegmentedControl
                  value={range.get()}
                  onChange={(value) => range.set(value as "7" | "30" | "365")}
                  options={[
                    { value: "7", label: "7 Tage" },
                    { value: "30", label: "30 Tage" },
                    { value: "365", label: "12 Monate" },
                  ]}
                  ariaLabel="Zeitraum wählen"
                  size="sm"
                />
              </div>
              <VeranstalterDashboardOverviewKpis state={kpis} />
            </section>
          </Show>
          <dl class="grid gap-3 rounded-card border border-border-subtle bg-surface p-4 sm:grid-cols-3 sm:p-5">
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
