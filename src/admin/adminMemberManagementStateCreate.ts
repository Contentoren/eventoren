import { createMemo, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { userSessionBrowserRestore } from "../auth/ui/signals/userSessionBrowserRestore.ts"
import { userTokenGet } from "../auth/ui/signals/userSessionSignal.ts"
import type { AdminMemberManagementState } from "./AdminMemberManagementState.ts"
import type { AdminZitadelMember } from "./AdminZitadelMember.ts"
import { adminMemberManagementInvitationFormat } from "./adminMemberManagementInvitationFormat.ts"
import { adminMemberManagementText } from "./adminMemberManagementText.ts"
import { adminZitadelMembersList } from "./adminZitadelMembersList.ts"
import { adminZitadelOrganizerGrant } from "./adminZitadelOrganizerGrant.ts"

export function adminMemberManagementStateCreate(): AdminMemberManagementState {
  const members = createSignalObject<readonly AdminZitadelMember[]>([])
  const total = createSignalObject(0)
  const search = createSignalObject(searchFromUrl())
  const isLoading = createSignalObject(false)
  const updatingMemberIds = createSignalObject<readonly string[]>([])
  const errorMessage = createSignalObject("")
  const successMessage = createSignalObject("")
  const text = createMemo(adminMemberManagementText)

  const reload = async () => {
    const token = userTokenGet()
    if (!token) return errorMessage.set(text().sessionRequired)
    isLoading.set(true)
    errorMessage.set("")
    successMessage.set("")
    const result = await adminZitadelMembersList({ search: search.get().trim() || undefined, token })
    isLoading.set(false)
    if (!result.success) return errorMessage.set(text().loadError)
    members.set(result.data.members)
    total.set(result.data.total)
  }

  const searchChange = (value: string) => {
    search.set(value)
  }

  const searchSubmit = async () => {
    searchWriteToUrl(search.get())
    await reload()
  }

  const roleChange = async (member: AdminZitadelMember) => {
    const token = userTokenGet()
    if (!token) return errorMessage.set(text().sessionRequired)
    const operation = member.organizerGranted ? "revoke" : "grant"
    updatingMemberIds.set([...updatingMemberIds.get(), member.zitadelUserId])
    errorMessage.set("")
    successMessage.set("")
    const result = await adminZitadelOrganizerGrant({ operation, token, zitadelUserId: member.zitadelUserId })
    updatingMemberIds.set(updatingMemberIds.get().filter((id) => id !== member.zitadelUserId))
    if (!result.success) return errorMessage.set(text().actionError)
    members.set(
      members.get().map((candidate) =>
        candidate.zitadelUserId === member.zitadelUserId
          ? {
              ...candidate,
              eventorenRole: result.data.eventorenRole,
              eventorenUserId: result.data.eventorenUserId,
              organizerGranted: result.data.organizerGranted,
              organizerInvitedAt: result.data.organizerInvitedAt,
              zitadelRoles: result.data.zitadelRoles,
            }
          : candidate,
      ),
    )
    successMessage.set(operation === "grant" ? text().granted : text().revoked)
  }

  onMount(() => {
    userSessionBrowserRestore()
    void reload()
  })

  return {
    errorMessage: errorMessage.get,
    invitationFormat: adminMemberManagementInvitationFormat,
    isLoading: isLoading.get,
    isUpdating: (zitadelUserId) => updatingMemberIds.get().includes(zitadelUserId),
    members: members.get,
    reload,
    roleChange,
    search: search.get,
    searchChange,
    searchSubmit,
    successMessage: successMessage.get,
    text,
    total: total.get,
  }
}

function searchFromUrl(): string {
  if (typeof window === "undefined") return ""
  return new URL(window.location.href).searchParams.get("memberSearch") ?? ""
}

function searchWriteToUrl(value: string): void {
  if (typeof window === "undefined") return
  const url = new URL(window.location.href)
  const trimmed = value.trim()
  if (trimmed) url.searchParams.set("memberSearch", trimmed)
  if (!trimmed) url.searchParams.delete("memberSearch")
  window.history.replaceState(window.history.state, "", url)
}
