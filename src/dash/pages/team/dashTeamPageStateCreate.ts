import { createSignalObject } from "#ui/utils/createSignalObject.js"

import type { DashMember } from "../../model/dashMemberSchema.ts"
import type { DashRole } from "../../model/dashRoleSchema.ts"
import { dashActiveOrg } from "../../store/dashActiveOrg.ts"
import { dashCan } from "../../store/dashCan.ts"
import { dashStateGet } from "../../store/dashStateGet.ts"
import { dashMemberInviteResend } from "../../store/actions/team/dashMemberInviteResend.ts"
import { dashMemberRemove } from "../../store/actions/team/dashMemberRemove.ts"
import { dashMemberRoleChange } from "../../store/actions/team/dashMemberRoleChange.ts"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"

/** Seitenzustand Team: Suche, Invite-Sheet, Entfernen-Dialog, Aktionen mit Toasts. */
export function dashTeamPageStateCreate() {
  const inviteOpen = createSignalObject(false)
  const removeTarget = createSignalObject<DashMember | null>(null)
  const searchOpen = createSignalObject(false)

  const org = () => dashActiveOrg()
  const canManage = () => dashCan("team.verwalten")
  const sessionUserId = () => dashStateGet().session.userId

  const members = (): DashMember[] => {
    const active = org()
    if (!active) return []
    return dashStateGet()
      .members.filter((member) => member.orgId === active.id)
      .slice()
      .sort((a, b) => {
        if (a.role === "inhaber" && b.role !== "inhaber") return -1
        if (b.role === "inhaber" && a.role !== "inhaber") return 1
        return a.name.localeCompare(b.name, "de")
      })
  }

  const ownerCount = () => members().filter((member) => member.role === "inhaber").length

  const changeRole = (member: DashMember, role: DashRole) => {
    if (!canManage()) return
    const result = dashMemberRoleChange(member.id, role)
    if (!result.success) toastAdd({ title: result.errorMessage, variant: "error" })
    else toastAdd({ title: `„${member.name}“ ist jetzt ${roleLabelShort(role)}.`, variant: "success" })
  }

  const resend = (member: DashMember) => {
    const result = dashMemberInviteResend(member.id)
    if (!result.success) toastAdd({ title: result.errorMessage, variant: "error" })
    else toastAdd({ title: `Einladung an ${member.email} erneut gesendet.`, variant: "success" })
  }

  const confirmRemove = () => {
    const target = removeTarget.get()
    if (!target) return
    const result = dashMemberRemove(target.id)
    if (!result.success) toastAdd({ title: result.errorMessage, variant: "error" })
    else toastAdd({ title: `„${target.name}“ wurde entfernt.`, variant: "success" })
    removeTarget.set(null)
  }

  return {
    org,
    canManage,
    sessionUserId,
    members,
    ownerCount,
    inviteOpen,
    removeTarget,
    searchOpen,
    changeRole,
    resend,
    confirmRemove,
  }
}

function roleLabelShort(role: DashRole): string {
  switch (role) {
    case "inhaber":
      return "Inhaber"
    case "admin":
      return "Admin"
    case "eventmanager":
      return "Event-Manager"
    case "finanzen":
      return "Finanzen"
    case "einlass":
      return "Einlass"
  }
}

export type DashTeamPageState = ReturnType<typeof dashTeamPageStateCreate>
