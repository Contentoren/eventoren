import { createResult, createResultError, type Result } from "#result"

import type { DashMember } from "../../../model/dashMemberSchema.ts"
import type { DashRole } from "../../../model/dashRoleSchema.ts"
import { dashRoleLabel } from "../../../model/dashRoleLabel.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

/** Ändert die Rolle eines Mitglieds; der letzte Inhaber kann nicht herabgestuft werden. */
export function dashMemberRoleChange(
  memberId: string,
  role: DashRole,
  store: DashStore = dashStoreGet(),
): Result<DashMember> {
  const op = "dashMemberRoleChange"
  const member = store.state.members.find((candidate) => candidate.id === memberId)
  if (!member) return createResultError(op, "Mitglied nicht gefunden.")
  if (member.role === role) return createResult(member)
  if (member.role === "inhaber" && role !== "inhaber") {
    const otherOwners = store.state.members.filter(
      (candidate) => candidate.orgId === member.orgId && candidate.role === "inhaber" && candidate.id !== member.id,
    )
    if (otherOwners.length === 0)
      return createResultError(
        op,
        "Der letzte Inhaber kann nicht herabgestuft werden. Übertrage die Inhaberschaft zuerst.",
      )
  }
  const beforeLabel = dashRoleLabel(member.role).label
  const afterLabel = dashRoleLabel(role).label
  const updated = store.update(op, (draft) => {
    const live = draft.members.find((candidate) => candidate.id === memberId)
    if (!live) throw new Error("Mitglied nicht gefunden.")
    live.role = role
    dashAuditAdd(draft, {
      orgId: member.orgId,
      eventId: null,
      area: "team",
      action: `Rolle von „${member.name}“ geändert`,
      before: beforeLabel,
      after: afterLabel,
    })
  })
  if (!updated.success) return createResultError(op, "Die Rolle konnte nicht geändert werden.")
  const next = store.state.members.find((candidate) => candidate.id === memberId)
  if (!next) return createResultError(op, "Mitglied nicht gefunden.")
  return createResult(next)
}
