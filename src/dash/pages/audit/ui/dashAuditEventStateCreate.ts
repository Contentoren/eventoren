import { dashActiveOrg } from "../../../store/dashActiveOrg.ts"
import { dashEventById } from "../../../store/dashEventById.ts"
import { dashStateGet } from "../../../store/dashStateGet.ts"

/** Löst Event und Organisation für die Protokoll-Seite auf. */
export function dashAuditEventStateCreate(inputs: { eventId: () => string }) {
  const org = () => dashActiveOrg()
  const event = () => dashEventById(inputs.eventId())
  const scopedOrgId = () => event()?.orgId ?? org()?.id ?? ""
  const auditCount = () =>
    dashStateGet().audit.filter(
      (entry) => entry.orgId === scopedOrgId() && (event() ? entry.eventId === event()?.id : true),
    ).length

  return { org, event, scopedOrgId, auditCount }
}

export type DashAuditEventState = ReturnType<typeof dashAuditEventStateCreate>
