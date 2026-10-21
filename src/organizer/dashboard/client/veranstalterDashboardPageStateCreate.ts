import { useContext } from "solid-js"
import { eventorenAuthContext } from "#src/auth/ui/eventorenAuthContext.ts"
import { veranstalterDashboardShellStateCreate } from "../ui/veranstalterDashboardShellStateCreate.ts"
import { veranstalterDashboardSourceLiveCreate } from "./veranstalterDashboardSourceLiveCreate.ts"

/** Shared authenticated, organization-scoped page state; all authority comes from the live context. */
export function veranstalterDashboardPageStateCreate(inputs: {
  readonly orgId: () => string | undefined
  readonly selectOrganization: (organizationId: string) => void
}) {
  const auth = useContext(eventorenAuthContext)
  const source = veranstalterDashboardSourceLiveCreate({ orgId: inputs.orgId })
  const shell = veranstalterDashboardShellStateCreate({
    source,
    authReady: auth.ready,
    authenticated: () => auth.identity() !== null,
    orgId: inputs.orgId,
    selectOrganization: inputs.selectOrganization,
  })
  return { shell, orgId: () => shell.activeOrganization()?.id }
}
