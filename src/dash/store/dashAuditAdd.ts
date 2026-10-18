import type { DashAuditArea } from "../model/dashAuditAreaSchema.ts"
import type { DashState } from "../model/dashStateSchema.ts"
import { dashIdCreate } from "./dashIdCreate.ts"

export function dashAuditAdd(
  draft: DashState,
  entry: {
    orgId: string
    eventId: string | null
    area: DashAuditArea
    action: string
    before?: string | null
    after?: string | null
  },
): void {
  const user = draft.users.find((candidate) => candidate.id === draft.session.userId)
  const actor = user?.name && user.name.length > 0 ? user.name : "Demo"
  draft.audit.push({
    id: dashIdCreate("audit"),
    orgId: entry.orgId,
    eventId: entry.eventId,
    at: new Date().toISOString(),
    actor,
    area: entry.area,
    action: entry.action,
    before: entry.before ?? null,
    after: entry.after ?? null,
  })
}
