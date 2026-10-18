import { useNavigate } from "@tanstack/solid-router"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { dashRoleLabel } from "../../../model/dashRoleLabel.ts"
import { dashActiveOrg } from "../../../store/dashActiveOrg.ts"
import { dashActiveRole } from "../../../store/dashActiveRole.ts"
import { dashSessionOrgSwitch } from "../../../store/dashSessionOrgSwitch.ts"
import { dashUserOrgs } from "../../../store/dashUserOrgs.ts"

export function dashOrgSwitcherStateCreate() {
  const navigate = useNavigate()
  const open = createSignalObject(false)
  const orgs = () => dashUserOrgs()
  const active = () => dashActiveOrg()
  const activeRoleLabel = () => {
    const role = dashActiveRole()
    return role ? dashRoleLabel(role).label : null
  }
  const publicHref = () => {
    const current = active()
    return current ? `/demo/customer/veranstalter/${current.slug}` : null
  }
  const select = (orgId: string, name: string) => {
    const result = dashSessionOrgSwitch(orgId)
    if (!result.success) {
      toastAdd({ title: "Wechsel fehlgeschlagen", variant: "error" })
      return
    }
    open.set(false)
    navigate({ to: "/demo/dashboard" })
    toastAdd({ title: `Zu ${name} gewechselt`, variant: "success" })
  }
  const create = () => {
    open.set(false)
    navigate({ to: "/demo/onboarding" })
  }
  return { open, orgs, active, activeRoleLabel, publicHref, select, create }
}

export type DashOrgSwitcherState = ReturnType<typeof dashOrgSwitcherStateCreate>
