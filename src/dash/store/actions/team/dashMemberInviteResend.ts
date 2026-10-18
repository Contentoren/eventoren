import { createResult, createResultError, type Result } from "#result"

import type { DashMember } from "../../../model/dashMemberSchema.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

/** Sendet eine Einladung erneut (aktualisiert invitedAt); nur für eingeladene Mitglieder. */
export function dashMemberInviteResend(memberId: string, store: DashStore = dashStoreGet()): Result<DashMember> {
  const op = "dashMemberInviteResend"
  const member = store.state.members.find((candidate) => candidate.id === memberId)
  if (!member) return createResultError(op, "Mitglied nicht gefunden.")
  if (member.status !== "eingeladen")
    return createResultError(op, "Nur ausstehende Einladungen können erneut gesendet werden.")
  const updated = store.update(op, (draft) => {
    const live = draft.members.find((candidate) => candidate.id === memberId)
    if (!live) throw new Error("Mitglied nicht gefunden.")
    live.invitedAt = new Date().toISOString()
    dashAuditAdd(draft, {
      orgId: member.orgId,
      eventId: null,
      area: "team",
      action: `Einladung an „${member.email}“ erneut gesendet`,
      before: null,
      after: member.email,
    })
  })
  if (!updated.success) return createResultError(op, "Die Einladung konnte nicht erneut gesendet werden.")
  const next = store.state.members.find((candidate) => candidate.id === memberId)
  if (!next) return createResultError(op, "Mitglied nicht gefunden.")
  return createResult(next)
}
