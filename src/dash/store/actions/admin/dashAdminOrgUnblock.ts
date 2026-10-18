import { createResultError, type Result } from "#result"

import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

/** Hebt die Sperrung einer Organisation auf (gesperrt → aktiv). */
export function dashAdminOrgUnblock(orgId: string, store: DashStore = dashStoreGet()): Result<void> {
  const op = "dashAdminOrgUnblock"
  const org = store.state.orgs.find((candidate) => candidate.id === orgId)
  if (!org) return createResultError(op, "Organisation nicht gefunden.")
  if (org.status !== "gesperrt") return createResultError(op, "Nur gesperrte Organisationen können entsperrt werden.")
  return store.update(op, (draft) => {
    const target = draft.orgs.find((candidate) => candidate.id === orgId)
    if (!target) throw new Error("Organisation nicht gefunden.")
    target.status = "aktiv"
    target.statusReason = ""
    dashAuditAdd(draft, {
      orgId: target.id,
      eventId: null,
      area: "admin",
      action: `Organisation „${target.name}“ entsperrt`,
      before: "Gesperrt",
      after: "Aktiv",
    })
  })
}
