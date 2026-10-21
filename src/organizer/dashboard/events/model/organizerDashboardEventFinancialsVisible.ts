import type { OrganizerDashboardPermission } from "#src/organizer/dashboard/model/organizerDashboardPermissionSchema.ts"

const organizerDashboardFinancialPermissions: ReadonlySet<OrganizerDashboardPermission> = new Set([
  "events.bearbeiten",
  "tickets.bearbeiten",
  "bestellungen.sehen",
  "umsatz.sehen",
  "finanzen.sehen",
])

export function organizerDashboardEventFinancialsVisible(
  permissions: readonly OrganizerDashboardPermission[],
): boolean {
  return permissions.some((permission) => organizerDashboardFinancialPermissions.has(permission))
}
