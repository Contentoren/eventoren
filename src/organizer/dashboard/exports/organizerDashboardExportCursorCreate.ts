export type OrganizerDashboardExportPageScope = {
  readonly kind: "exports"
  readonly userId: string
  readonly orgId: string
  readonly eventKey: string
  readonly list: "teilnehmer" | "bestellungen" | "checkins"
  readonly search: string
}

export function organizerDashboardExportCursorCreate(
  scope: OrganizerDashboardExportPageScope,
  sourceCursor: string,
): string {
  return JSON.stringify({ version: 1, scope, sourceCursor })
}
