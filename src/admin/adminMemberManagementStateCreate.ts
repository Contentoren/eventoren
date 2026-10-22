import { createMemo, onMount } from "solid-js"
import * as v from "valibot"
import { type ZitadelRole, zitadelRole } from "#src/auth/model_field/zitadelRole.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { AdminMemberManagementState } from "./AdminMemberManagementState.ts"
import type { AdminZitadelMember } from "./AdminZitadelMember.ts"
import { adminAvailableRolesRead } from "./adminAvailableRoles.ts"
import { adminMemberManagementInvitationFormat } from "./adminMemberManagementInvitationFormat.ts"
import { adminMemberManagementText } from "./adminMemberManagementText.ts"
import type { adminZitadelMembersList } from "./adminZitadelMembersList.ts"
import type { adminZitadelRolesSet } from "./adminZitadelRolesSet.ts"

export function adminMemberManagementStateCreate(
  inputs: { readonly list?: AdminMemberList; readonly setRoles?: AdminMemberRolesSet } = {},
): AdminMemberManagementState {
  const list = inputs.list
  const members = createSignalObject<readonly AdminZitadelMember[]>([])
  const roleFilter = createSignalObject<RoleFilter>("all")
  const roleFilterSignal = {
    get: roleFilter.get,
    set: (value: RoleFilter) => {
      roleFilter.set(value)
      roleFilterWriteToUrl(value)
    },
  }
  const search = createSignalObject("")
  const hasLoaded = createSignalObject(false)
  const isLoading = createSignalObject(true)
  const updatingMemberIds = createSignalObject<readonly string[]>([])
  const editingMember = createSignalObject<AdminZitadelMember | undefined>(undefined)
  const draftRoles = createSignalObject<ZitadelRole[]>([])
  const errorMessage = createSignalObject("")
  const successMessage = createSignalObject("")
  const text = createMemo(adminMemberManagementText)

  const availableRoles = createMemo(() => adminAvailableRolesRead(members.get()))

  const reload = async () => {
    if (!list) {
      isLoading.set(false)
      return errorMessage.set(text().sessionRequired)
    }
    isLoading.set(true)
    errorMessage.set("")
    successMessage.set("")
    const result = await list({ search: search.get().trim() || undefined })
    isLoading.set(false)
    if (!result.success) return errorMessage.set(text().loadError)
    members.set(result.data.members)
    hasLoaded.set(true)
  }

  const searchChange = (value: string) => {
    search.set(value)
  }

  const searchSubmit = async () => {
    searchWriteToUrl(search.get())
    await reload()
  }

  const filteredMembers = () => {
    const selected = roleFilter.get()
    return members
      .get()
      .filter(
        (member) => member.zitadelRoles.length > 0 && (selected === "all" || member.zitadelRoles.includes(selected)),
      )
  }

  const openEdit = (member: AdminZitadelMember) => {
    errorMessage.set("")
    successMessage.set("")
    editingMember.set(member)
    draftRoles.set([...member.zitadelRoles])
  }

  const closeEdit = () => {
    editingMember.set(undefined)
  }

  const saveRoles = async () => {
    const member = editingMember.get()
    if (!member) return
    const roles = [...new Set(draftRoles.get())]
    if (roles.length === 0) return errorMessage.set(text().emptyRoles)
    updatingMemberIds.set([...updatingMemberIds.get(), member.zitadelUserId])
    errorMessage.set("")
    successMessage.set("")
    let result: AdminMemberRolesSetResult
    if (inputs.setRoles) {
      result = await inputs.setRoles({ roles, zitadelUserId: member.zitadelUserId })
    } else {
      updatingMemberIds.set(updatingMemberIds.get().filter((id) => id !== member.zitadelUserId))
      return errorMessage.set(text().sessionRequired)
    }
    updatingMemberIds.set(updatingMemberIds.get().filter((id) => id !== member.zitadelUserId))
    if (!result.success) {
      if (result.errorMessage === "The last admin role cannot be removed") {
        return errorMessage.set(text().lastAdminDenied)
      }
      return errorMessage.set(text().actionError)
    }
    members.set(
      members.get().map((candidate) =>
        candidate.zitadelUserId === member.zitadelUserId
          ? {
              ...candidate,
              eventorenRole: result.data.eventorenRole,
              eventorenUserId: result.data.eventorenUserId,
              organizerGranted: result.data.organizerGranted,
              organizerInvitedAt: result.data.organizerInvitedAt,
              zitadelRoles: result.data.roles,
            }
          : candidate,
      ),
    )
    editingMember.set(undefined)
    successMessage.set(text().saved)
  }

  onMount(() => {
    roleFilter.set(roleFilterFromUrl())
    search.set(searchFromUrl())
    void reload()
  })

  return {
    availableRoles,
    closeEdit,
    draftRoles,
    editingMember: editingMember.get,
    errorMessage: errorMessage.get,
    hasLoaded: hasLoaded.get,
    invitationFormat: adminMemberManagementInvitationFormat,
    isLoading: isLoading.get,
    isUpdating: (zitadelUserId) => updatingMemberIds.get().includes(zitadelUserId),
    members: filteredMembers,
    openEdit,
    reload,
    roleFilter: roleFilterSignal,
    saveRoles,
    search: search.get,
    searchChange,
    searchSubmit,
    successMessage: successMessage.get,
    text,
    total: () => filteredMembers().length,
  }
}

type AdminMemberRolesSet = (input: {
  readonly roles: readonly ZitadelRole[]
  readonly zitadelUserId: string
}) => Promise<AdminMemberRolesSetResult>

type AdminMemberRolesSetResult = Awaited<ReturnType<typeof adminZitadelRolesSet>>
type AdminMemberList = (input: { readonly search?: string }) => ReturnType<typeof adminZitadelMembersList>
type RoleFilter = "all" | ZitadelRole
const roleSchema = v.picklist([zitadelRole.admin, zitadelRole.user, zitadelRole.organizer, zitadelRole.customer])

function roleFilterFromUrl(): RoleFilter {
  if (typeof window === "undefined") return "all"
  const roles = new URL(window.location.href).searchParams.getAll("memberRole").flatMap((value) => {
    const parsed = v.safeParse(roleSchema, value)
    return parsed.success ? [parsed.output] : []
  })
  const uniqueRoles = [...new Set(roles)]
  if (uniqueRoles.length !== 1) return "all"
  return uniqueRoles[0] ?? "all"
}

function roleFilterWriteToUrl(role: RoleFilter): void {
  if (typeof window === "undefined") return
  const url = new URL(window.location.href)
  url.searchParams.delete("memberRole")
  if (role !== "all") url.searchParams.set("memberRole", role)
  window.history.replaceState(window.history.state, "", url)
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
