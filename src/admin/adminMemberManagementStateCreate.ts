import { createMemo, onMount } from "solid-js"
import * as v from "valibot"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { AdminMemberManagementState } from "./AdminMemberManagementState.ts"
import type { AdminZitadelMember } from "./AdminZitadelMember.ts"
import { adminMemberManagementInvitationFormat } from "./adminMemberManagementInvitationFormat.ts"
import { adminMemberManagementText } from "./adminMemberManagementText.ts"
import type { adminZitadelMembersList } from "./adminZitadelMembersList.ts"
import type { adminZitadelOrganizerGrant } from "./adminZitadelOrganizerGrant.ts"

export function adminMemberManagementStateCreate(
  inputs: { readonly list?: AdminMemberList; readonly roleChange?: AdminMemberRoleChange } = {},
): AdminMemberManagementState {
  const list = inputs.list
  const members = createSignalObject<readonly AdminZitadelMember[]>([])
  const roleFilter = createSignalObject<Role[]>(rolesFromUrl())
  const search = createSignalObject(searchFromUrl())
  const hasLoaded = createSignalObject(false)
  const isLoading = createSignalObject(true)
  const updatingMemberIds = createSignalObject<readonly string[]>([])
  const errorMessage = createSignalObject("")
  const successMessage = createSignalObject("")
  const text = createMemo(adminMemberManagementText)

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

  const roleFilterToggle = (role: Role) => {
    const selected = roleFilter.get()
    const next = selected.includes(role) ? selected.filter((value) => value !== role) : [...selected, role]
    roleFilter.set(next)
    rolesWriteToUrl(next)
  }

  const filteredMembers = createMemo(() => {
    const selected = roleFilter.get()
    return members
      .get()
      .filter(
        (member) =>
          member.zitadelRoles.length > 0 &&
          (selected.length === 0 || selected.some((role) => member.zitadelRoles.includes(role))),
      )
  })

  const roleChange = async (member: AdminZitadelMember) => {
    const operation = member.organizerGranted ? "revoke" : "grant"
    updatingMemberIds.set([...updatingMemberIds.get(), member.zitadelUserId])
    errorMessage.set("")
    successMessage.set("")
    let result: AdminMemberRoleChangeResult
    if (inputs.roleChange) {
      result = await inputs.roleChange({ operation, zitadelUserId: member.zitadelUserId })
    } else {
      updatingMemberIds.set(updatingMemberIds.get().filter((id) => id !== member.zitadelUserId))
      return errorMessage.set(text().sessionRequired)
    }
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
    void reload()
  })

  return {
    errorMessage: errorMessage.get,
    hasLoaded: hasLoaded.get,
    invitationFormat: adminMemberManagementInvitationFormat,
    isLoading: isLoading.get,
    isUpdating: (zitadelUserId) => updatingMemberIds.get().includes(zitadelUserId),
    members: filteredMembers,
    reload,
    roleChange,
    roleFilter: roleFilter.get,
    roleFilterToggle,
    search: search.get,
    searchChange,
    searchSubmit,
    successMessage: successMessage.get,
    text,
    total: () => filteredMembers().length,
  }
}

type AdminMemberRoleChange = (input: {
  readonly operation: "grant" | "revoke"
  readonly zitadelUserId: string
}) => Promise<AdminMemberRoleChangeResult>

type AdminMemberRoleChangeResult = Awaited<ReturnType<typeof adminZitadelOrganizerGrant>>
type AdminMemberList = (input: { readonly search?: string }) => ReturnType<typeof adminZitadelMembersList>
type Role = "admin" | "organizer"
const roleSchema = v.picklist(["admin", "organizer"] as const)

function rolesFromUrl(): Role[] {
  if (typeof window === "undefined") return []
  return new URL(window.location.href).searchParams.getAll("memberRole").flatMap((value) => {
    const parsed = v.safeParse(roleSchema, value)
    return parsed.success ? [parsed.output] : []
  })
}

function rolesWriteToUrl(roles: readonly Role[]): void {
  if (typeof window === "undefined") return
  const url = new URL(window.location.href)
  url.searchParams.delete("memberRole")
  for (const role of roles) url.searchParams.append("memberRole", role)
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
