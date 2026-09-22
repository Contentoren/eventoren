import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { AdminOrganizerMembersPageState } from "../../admin/AdminOrganizerMembersPageState.ts"
import type { AdminZitadelMember } from "../../admin/AdminZitadelMember.ts"
import { adminMemberManagementInvitationFormat } from "../../admin/adminMemberManagementInvitationFormat.ts"
import { demoAdminMembers } from "../fixtures/demoAdminMembers.ts"
import type { DemoFlowContextValue } from "./demoFlowContext.ts"
import { demoFlowContextUse } from "./demoFlowContextUse.ts"

export function demoAdminOrganizerMembersPageStateCreate(inputs?: {
  readonly flow?: DemoFlowContextValue
  readonly members?: readonly AdminZitadelMember[]
}): AdminOrganizerMembersPageState {
  const flow = inputs?.flow ?? demoFlowContextUse()
  const baseMembers = inputs?.members ?? demoAdminMembers.filter((member) => member.organizerGranted)

  const membersSignal = createSignalObject<readonly AdminZitadelMember[]>(baseMembers)
  const baseErrorMessage = createSignalObject("")

  const hasFlow = () => flow.hasFlowStates()
  const isLoading = () => (hasFlow() ? flow.isLoading() : false)
  const isError = () => (hasFlow() ? flow.isError() : Boolean(baseErrorMessage.get()))
  const isEmpty = () => (hasFlow() ? flow.isEmpty() : false)
  const hasLoaded = () => (hasFlow() ? !flow.isLoading() && !flow.isError() : !baseErrorMessage.get())

  const members = () => {
    if (isLoading() || isError() || isEmpty()) return []
    return membersSignal.get()
  }

  const errorMessage = () => {
    if (isError()) return "Die Veranstalter konnten nicht geladen werden."
    return baseErrorMessage.get()
  }

  const reload = async () => {
    if (hasFlow() && (flow.isError() || flow.isEmpty())) {
      flow.setState("loaded")
    }
    membersSignal.set(baseMembers)
    baseErrorMessage.set("")
    await Promise.resolve()
  }

  return {
    contact: (member: AdminZitadelMember) => member.email ?? member.preferredLoginName ?? member.userName,
    errorMessage,
    hasLoaded,
    invitationFormat: adminMemberManagementInvitationFormat,
    isLoading,
    members,
    reload,
  }
}
