import { createResult, createResultError, type Result } from "#result"

import type { DashMember } from "../../../model/dashMemberSchema.ts"
import type { DashRole } from "../../../model/dashRoleSchema.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStateGet } from "../../dashStateGet.ts"
import { dashIdCreate } from "../../dashIdCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

const dashMemberEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function dashMemberDisplayName(email: string): string {
  const local = email.split("@")[0] ?? ""
  const cleaned = local.replace(/[._-]+/g, " ").trim()
  if (cleaned === "") return email
  return cleaned
    .split(" ")
    .filter((part) => part !== "")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export type DashMemberInviteResult = {
  invited: number
  skipped: string[]
}

/** Lädt E-Mail-Adressen als Mitglieder ein; bestehende Mitglieder werden übersprungen. */
export function dashMemberInvite(
  input: { orgId: string; emails: string[]; role: DashRole },
  store: DashStore = dashStoreGet(),
): Result<DashMemberInviteResult> {
  const op = "dashMemberInvite"
  const org = store.state.orgs.find((candidate) => candidate.id === input.orgId)
  if (!org) return createResultError(op, "Organisation nicht gefunden.")
  const state = dashStateGet()
  const selfMember = state.members.find(
    (candidate) => candidate.orgId === input.orgId && candidate.userId === state.session.userId,
  )
  void selfMember
  const invitedAt = new Date().toISOString()
  const added: DashMember[] = []
  const skipped: string[] = []
  for (const raw of input.emails) {
    const email = raw.trim()
    if (email === "" || !dashMemberEmailPattern.test(email)) continue
    const exists = store.state.members.some(
      (candidate) => candidate.orgId === input.orgId && candidate.email.toLowerCase() === email.toLowerCase(),
    )
    if (exists) {
      skipped.push(email)
      continue
    }
    added.push({
      id: dashIdCreate("member"),
      orgId: input.orgId,
      userId: null,
      name: dashMemberDisplayName(email),
      email,
      role: input.role,
      status: "eingeladen",
      invitedAt,
    })
  }
  if (added.length === 0 && skipped.length === 0) return createResultError(op, "Keine gültige E-Mail-Adresse gefunden.")
  const updated = store.update(op, (draft) => {
    for (const member of added) draft.members.push(member)
    dashAuditAdd(draft, {
      orgId: input.orgId,
      eventId: null,
      area: "team",
      action:
        added.length === 1
          ? `„${added[0]?.email}“ eingeladen`
          : `${added.length} ${added.length === 1 ? "Mitglied" : "Mitglieder"} eingeladen`,
      before: null,
      after: added.length > 0 ? added.map((member) => member.email).join(", ") : null,
    })
  })
  if (!updated.success) return createResultError(op, "Die Einladungen konnten nicht gespeichert werden.")
  return createResult({ invited: added.length, skipped })
}
