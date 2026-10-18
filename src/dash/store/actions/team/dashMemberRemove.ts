import { createResult, createResultError, type Result } from "#result"

import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

/** Entfernt ein Mitglied; schützt den letzten Inhaber und dich selbst. */
export function dashMemberRemove(memberId: string, store: DashStore = dashStoreGet()): Result<{ removed: string }> {
  const op = "dashMemberRemove"
  const member = store.state.members.find((candidate) => candidate.id === memberId)
  if (!member) return createResultError(op, "Mitglied nicht gefunden.")
  if (member.userId !== null && member.userId === store.state.session.userId)
    return createResultError(op, "Du kannst dich nicht selbst entfernen.")
  if (member.role === "inhaber") {
    const otherOwners = store.state.members.filter(
      (candidate) => candidate.orgId === member.orgId && candidate.role === "inhaber" && candidate.id !== member.id,
    )
    if (otherOwners.length === 0)
      return createResultError(op, "Der letzte Inhaber kann nicht entfernt werden. Übertrage die Inhaberschaft zuerst.")
  }
  const updated = store.update(op, (draft) => {
    const index = draft.members.findIndex((candidate) => candidate.id === memberId)
    if (index === -1) throw new Error("Mitglied nicht gefunden.")
    draft.members.splice(index, 1)
    dashAuditAdd(draft, {
      orgId: member.orgId,
      eventId: null,
      area: "team",
      action: `„${member.name}“ entfernt`,
      before: member.email,
      after: null,
    })
  })
  if (!updated.success) return createResultError(op, "Das Mitglied konnte nicht entfernt werden.")
  return createResult({ removed: member.name })
}
