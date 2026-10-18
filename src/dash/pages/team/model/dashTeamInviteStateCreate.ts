import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"

import type { DashRole } from "../../../model/dashRoleSchema.ts"
import { dashMemberInvite } from "../../../store/actions/team/dashMemberInvite.ts"
import { dashTeamEmailsParse } from "./dashTeamEmailsParse.ts"

/** Sheet-Zustand „Mitglied einladen“: E-Mail-Text, Rolle, Live-Zähler, Einladen. */
export function dashTeamInviteStateCreate(orgId: () => string | null, onDone: () => void) {
  const emails = createSignalObject("")
  const role = createSignalObject<DashRole>("einlass")
  const showErrors = createSignalObject(false)

  const parsed = () => dashTeamEmailsParse(emails.get())

  const invite = () => {
    const org = orgId()
    if (!org) return
    const current = parsed()
    if (current.invalid.length > 0) showErrors.set(true)
    if (current.valid.length === 0) {
      toastAdd({ title: "Bitte gib mindestens eine gültige E-Mail-Adresse an.", variant: "error" })
      return
    }
    const result = dashMemberInvite({ orgId: org, emails: current.valid, role: role.get() })
    if (!result.success) {
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    const skippedNote = result.data.skipped.length > 0 ? ` · ${result.data.skipped.length} bereits dabei` : ""
    toastAdd({
      title: `${result.data.invited} ${result.data.invited === 1 ? "Einladung" : "Einladungen"} verschickt${skippedNote}.`,
      variant: "success",
    })
    emails.set("")
    role.set("einlass")
    showErrors.set(false)
    onDone()
  }

  const reset = () => {
    emails.set("")
    role.set("einlass")
    showErrors.set(false)
  }

  return { emails, role, showErrors, parsed, invite, reset }
}

export type DashTeamInviteState = ReturnType<typeof dashTeamInviteStateCreate>
