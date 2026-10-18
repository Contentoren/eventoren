import { createResultError, type Result } from "#result"

import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

/** Sperrt eine Organisation; ein Sperrgrund ist Pflicht. */
export function dashAdminOrgBlock(orgId: string, reason: string, store: DashStore = dashStoreGet()): Result<void> {
  const op = "dashAdminOrgBlock"
  const org = store.state.orgs.find((candidate) => candidate.id === orgId)
  if (!org) return createResultError(op, "Organisation nicht gefunden.")
  if (org.status === "gesperrt") return createResultError(op, "Die Organisation ist bereits gesperrt.")
  const trimmed = reason.trim()
  if (trimmed === "") return createResultError(op, "Ein Sperrgrund ist erforderlich.")
  return store.update(op, (draft) => {
    const target = draft.orgs.find((candidate) => candidate.id === orgId)
    if (!target) throw new Error("Organisation nicht gefunden.")
    const before = target.status === "pruefung" ? "In Prüfung" : "Aktiv"
    target.status = "gesperrt"
    target.statusReason = trimmed
    dashAuditAdd(draft, {
      orgId: target.id,
      eventId: null,
      area: "admin",
      action: `Organisation „${target.name}“ gesperrt`,
      before,
      after: `Gesperrt: ${trimmed}`,
    })
  })
}
