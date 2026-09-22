import { onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { AdminZitadelMember } from "./AdminZitadelMember.ts"
import { adminMemberManagementInvitationFormat } from "./adminMemberManagementInvitationFormat.ts"
import type { adminZitadelOrganizerMembersList } from "./adminZitadelOrganizerMembersList.ts"

export function adminOrganizerMembersPageStateCreate(
  inputs: { readonly list?: () => ReturnType<typeof adminZitadelOrganizerMembersList> } = {},
) {
  const list = inputs.list
  const members = createSignalObject<readonly AdminZitadelMember[]>([])
  const hasLoaded = createSignalObject(false)
  const isLoading = createSignalObject(true)
  const errorMessage = createSignalObject("")

  const reload = async () => {
    if (!list) {
      isLoading.set(false)
      return errorMessage.set("Die Admin-Sitzung ist nicht verfügbar.")
    }
    isLoading.set(true)
    errorMessage.set("")
    const result = await list()
    isLoading.set(false)
    if (!result.success) return errorMessage.set(result.errorMessage)
    members.set(result.data.members)
    hasLoaded.set(true)
  }

  onMount(() => {
    void reload()
  })

  return {
    contact: (member: AdminZitadelMember) => member.email ?? member.preferredLoginName ?? member.userName,
    errorMessage: errorMessage.get,
    hasLoaded: hasLoaded.get,
    invitationFormat: adminMemberManagementInvitationFormat,
    isLoading: isLoading.get,
    members: members.get,
    reload,
  }
}
