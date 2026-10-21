import { Show } from "solid-js"
import { VeranstalterDashboardEmptyState } from "./VeranstalterDashboardEmptyState.tsx"
import { VeranstalterDashboardErrorState } from "./VeranstalterDashboardErrorState.tsx"
import { VeranstalterDashboardLoadingState } from "./VeranstalterDashboardLoadingState.tsx"
import { VeranstalterDashboardLoginState } from "./VeranstalterDashboardLoginState.tsx"
import { VeranstalterDashboardOrganizationOverview } from "./VeranstalterDashboardOrganizationOverview.tsx"
import { VeranstalterDashboardOrganizationSelect } from "./VeranstalterDashboardOrganizationSelect.tsx"
import { VeranstalterDashboardShell } from "./VeranstalterDashboardShell.tsx"
import type { VeranstalterDashboardShellState } from "./veranstalterDashboardShellStateCreate.ts"

/** Live Veranstalter dashboard overview: shell plus one view per shell state. */
export function VeranstalterDashboardOverviewPage(p: { readonly state: VeranstalterDashboardShellState }) {
  return (
    <VeranstalterDashboardShell state={p.state} orgId={p.state.requestedOrgId}>
      <Show when={p.state.view() === "loading"}>
        <VeranstalterDashboardLoadingState />
      </Show>
      <Show when={p.state.view() === "login"}>
        <VeranstalterDashboardLoginState />
      </Show>
      <Show when={p.state.view() === "error"}>
        <VeranstalterDashboardErrorState state={p.state} />
      </Show>
      <Show when={p.state.view() === "empty"}>
        <VeranstalterDashboardEmptyState />
      </Show>
      <Show when={p.state.view() === "select"}>
        <VeranstalterDashboardOrganizationSelect state={p.state} />
      </Show>
      <Show when={p.state.view() === "ready"}>
        <VeranstalterDashboardOrganizationOverview state={p.state} />
      </Show>
    </VeranstalterDashboardShell>
  )
}
