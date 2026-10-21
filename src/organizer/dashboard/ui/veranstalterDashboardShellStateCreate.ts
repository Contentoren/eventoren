import type { VeranstalterDashboardSource } from "../client/VeranstalterDashboardSource.ts"
import type { VeranstalterDashboardActiveOrganization } from "../client/veranstalterDashboardActiveOrganizationSchema.ts"
import type { VeranstalterDashboardOrganization } from "../client/veranstalterDashboardOrganizationSchema.ts"
import { veranstalterDashboardOrganizationStatusLabel } from "../client/veranstalterDashboardOrganizationStatusLabel.ts"
import { veranstalterDashboardRoleLabel } from "../client/veranstalterDashboardRoleLabel.ts"

export type VeranstalterDashboardShellView = "loading" | "login" | "error" | "empty" | "select" | "ready"

export interface VeranstalterDashboardShellStateInputs {
  readonly source: VeranstalterDashboardSource
  readonly authReady: () => boolean
  readonly authenticated: () => boolean
  readonly orgId: () => string | undefined
  readonly selectOrganization: (organizationId: string) => void
}

export function veranstalterDashboardShellStateCreate(inputs: VeranstalterDashboardShellStateInputs) {
  const contextResult = () => inputs.source.contextResult()

  const view = (): VeranstalterDashboardShellView => {
    if (!inputs.authReady()) return "loading"
    if (!inputs.authenticated()) return "login"
    const result = contextResult()
    if (!result) return "loading"
    if (!result.success) return "error"
    if (result.data.organizations.length === 0) return "empty"
    if (requestedOrgUnknown()) return "select"
    if (!inputs.orgId() && result.data.organizations.length > 1) return "select"
    if (!result.data.activeOrganization) return "select"
    return "ready"
  }

  const organizations = (): readonly VeranstalterDashboardOrganization[] => {
    const result = contextResult()
    if (!result || !result.success) return []
    return result.data.organizations
  }

  const activeOrganization = (): VeranstalterDashboardActiveOrganization | null => {
    const result = contextResult()
    if (!result || !result.success) return null
    return result.data.activeOrganization
  }

  // Navigation affordance only; every team query/mutation authorizes again.
  const canManageTeam = (): boolean => activeOrganization()?.permissions.includes("team.verwalten") ?? false
  const canReadOrders = (): boolean => activeOrganization()?.permissions.includes("bestellungen.sehen") ?? false

  const errorMessage = (): string => {
    const result = contextResult()
    if (result && !result.success) return result.errorMessage
    return ""
  }

  const requestedOrgUnknown = (): boolean => {
    const requested = inputs.orgId()
    if (!requested) return false
    return !organizations().some((organization) => organization.id === requested)
  }

  const roleLabel = (): string | null => {
    const active = activeOrganization()
    return active ? veranstalterDashboardRoleLabel(active.role).label : null
  }

  const roleDescription = (): string | null => {
    const active = activeOrganization()
    return active ? veranstalterDashboardRoleLabel(active.role).description : null
  }

  const statusLabel = (): string | null => {
    const active = activeOrganization()
    return active ? veranstalterDashboardOrganizationStatusLabel(active.status).label : null
  }

  return {
    view,
    organizations,
    activeOrganization,
    canManageTeam,
    canReadOrders,
    errorMessage,
    requestedOrgId: inputs.orgId,
    requestedOrgUnknown,
    roleLabel,
    roleDescription,
    statusLabel,
    selectOrganization: inputs.selectOrganization,
  }
}

export type VeranstalterDashboardShellState = ReturnType<typeof veranstalterDashboardShellStateCreate>
