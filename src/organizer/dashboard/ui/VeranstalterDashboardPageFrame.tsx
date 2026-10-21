import { Show, type JSX } from "solid-js"
import type { VeranstalterDashboardShellState } from "./veranstalterDashboardShellStateCreate.ts"
import { VeranstalterDashboardEmptyState } from "./VeranstalterDashboardEmptyState.tsx"
import { VeranstalterDashboardErrorState } from "./VeranstalterDashboardErrorState.tsx"
import { VeranstalterDashboardLoadingState } from "./VeranstalterDashboardLoadingState.tsx"
import { VeranstalterDashboardLoginState } from "./VeranstalterDashboardLoginState.tsx"
import { VeranstalterDashboardOrganizationSelect } from "./VeranstalterDashboardOrganizationSelect.tsx"
import { VeranstalterDashboardShell } from "./VeranstalterDashboardShell.tsx"
import { veranstalterDashboardPageFrameStateCreate } from "./veranstalterDashboardPageFrameStateCreate.ts"

/**
 * A common access/loading boundary for focused live dashboard pages.
 * Pages that work without an organisation (onboarding) pass
 * `organizationOptional`; every other page keeps the org requirement.
 * A single content `Show` keeps children mounted across the
 * empty/select-to-ready transition so form state survives creation.
 */
export function VeranstalterDashboardPageFrame(props: {
  readonly state: VeranstalterDashboardShellState
  readonly organizationOptional?: boolean
  readonly children: JSX.Element
}) {
  const frame = veranstalterDashboardPageFrameStateCreate({
    view: () => props.state.view(),
    organizationOptional: () => props.organizationOptional ?? false,
  })
  return (
    <VeranstalterDashboardShell state={props.state} orgId={props.state.requestedOrgId}>
      <Show when={props.state.view() === "loading"}>
        <VeranstalterDashboardLoadingState />
      </Show>
      <Show when={props.state.view() === "login"}>
        <VeranstalterDashboardLoginState />
      </Show>
      <Show when={props.state.view() === "error"}>
        <VeranstalterDashboardErrorState state={props.state} />
      </Show>
      <Show when={frame.emptyVisible()}>
        <VeranstalterDashboardEmptyState />
      </Show>
      <Show when={frame.selectionVisible()}>
        <VeranstalterDashboardOrganizationSelect state={props.state} />
      </Show>
      <Show when={frame.contentVisible()}>{props.children}</Show>
    </VeranstalterDashboardShell>
  )
}
