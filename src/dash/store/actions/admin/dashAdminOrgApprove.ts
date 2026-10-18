import { createResultError, type Result } from "#result"

import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

/** Gibt eine Organisation aus der Prüfung frei (pruefung → aktiv). */
export function dashAdminOrgApprove(orgId: string, store: DashStore = dashStoreGet()): Result<void> {
  const op = "dashAdminOrgApprove"
  const org = store.state.orgs.find((candidate) => candidate.id === orgId)
  if (!org) return createResultError(op, "Organisation nicht gefunden.")
  if (org.status !== "pruefung")
    return createResultError(op, "Nur Organisationen in Prüfung können freigegeben werden.")
  return store.update(op, (draft) => {
    const target = draft.orgs.find((candidate) => candidate.id === orgId)
    if (!target) throw new Error("Organisation nicht gefunden.")
    target.status = "aktiv"
    target.statusReason = ""
    dashAuditAdd(draft, {
      orgId: target.id,
      eventId: null,
      area: "admin",
      action: `Organisation „${target.name}“ freigegeben`,
      before: "In Prüfung",
      after: "Aktiv",
    })
  })
}
