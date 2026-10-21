import type { OrganizerDashboardOrderPageScope } from "./organizerDashboardOrderPageScope.ts"

export function organizerDashboardOrderCursorCreate(
  scope: OrganizerDashboardOrderPageScope,
  sourceCursor: string,
): string {
  return JSON.stringify({ version: 1, scope, sourceCursor })
}
