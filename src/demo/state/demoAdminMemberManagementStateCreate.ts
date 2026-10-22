import { createMemo } from "solid-js"
import type { ZitadelRole } from "#src/auth/model_field/zitadelRole.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { AdminMemberManagementState } from "../../admin/AdminMemberManagementState.ts"
import type { AdminZitadelMember } from "../../admin/AdminZitadelMember.ts"
import { adminAvailableRolesRead } from "../../admin/adminAvailableRoles.ts"
import { adminMemberManagementText } from "../../admin/adminMemberManagementText.ts"
import { demoAdminMembers } from "../fixtures/demoAdminMembers.ts"
import type { DemoFlowContextValue } from "./demoFlowContext.ts"
import { demoFlowContextUse } from "./demoFlowContextUse.ts"

export function demoAdminMemberManagementStateCreate(
  inputs?:
    | "populated"
    | "empty"
    | "error"
    | {
        scenario?: "populated" | "empty" | "error"
        flow?: DemoFlowContextValue
      },
): AdminMemberManagementState {
  const scenario = typeof inputs === "string" ? inputs : (inputs?.scenario ?? "populated")
  const flow = typeof inputs === "object" && inputs?.flow ? inputs.flow : demoFlowContextUse()

  const baseMembers = createSignalObject<readonly AdminZitadelMember[]>(scenario === "empty" ? [] : demoAdminMembers)
  const search = createSignalObject("")
  const roleFilter = createSignalObject<"all" | ZitadelRole>("all")
  const updatingMemberIds = createSignalObject<readonly string[]>([])
  const editingMember = createSignalObject<AdminZitadelMember | undefined>(undefined)
  const draftRoles = createSignalObject<ZitadelRole[]>([])
  const baseErrorMessage = createSignalObject(
    scenario === "error" ? "Die Mitglieder konnten nicht geladen werden." : "",
  )
  const successMessage = createSignalObject("")
  const text = createMemo(adminMemberManagementText)

  const hasFlow = () => flow.hasFlowStates()
  const isLoading = () => (hasFlow() ? flow.isLoading() : false)
  const isError = () => (hasFlow() ? flow.isError() : scenario === "error")
  const isEmpty = () => (hasFlow() ? flow.isEmpty() : scenario === "empty")
  const hasLoaded = () => (hasFlow() ? !flow.isLoading() && !flow.isError() : scenario !== "error")

  const members = () => {
    if (isLoading() || isError() || isEmpty()) return []
    const selected = roleFilter.get()
    return baseMembers
      .get()
      .filter(
        (member) => member.zitadelRoles.length > 0 && (selected === "all" || member.zitadelRoles.includes(selected)),
      )
  }

  const total = () => members().length

  const errorMessage = () => {
    if (isError()) return "Die Mitglieder konnten nicht geladen werden."
    return baseErrorMessage.get()
  }

  const reload = async () => {
    if (hasFlow() && (flow.isError() || flow.isEmpty())) {
      flow.setState("loaded")
      baseMembers.set(demoAdminMembers)
      baseErrorMessage.set("")
      return
    }

    if (scenario === "error") {
      baseMembers.set([])
      baseErrorMessage.set(text().loadError)
      successMessage.set("")
      return
    }

    baseErrorMessage.set("")
    successMessage.set("")
    await Promise.resolve()
    const query = search.get().trim().toLowerCase()
    const filtered =
      scenario === "empty"
        ? []
        : demoAdminMembers.filter((member) => {
            if (!query) return true
            return [member.displayName, member.userName, member.email, member.preferredLoginName]
              .filter((value): value is string => Boolean(value))
              .some((value) => value.toLowerCase().includes(query))
          })
    baseMembers.set(filtered)
  }

  const searchChange = (value: string) => search.set(value)
  const searchSubmit = async () => reload()

  const openEdit = (member: AdminZitadelMember) => {
    baseErrorMessage.set("")
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
    if (roles.length === 0) return baseErrorMessage.set(text().emptyRoles)
    updatingMemberIds.set([...updatingMemberIds.get(), member.zitadelUserId])
    baseErrorMessage.set("")
    successMessage.set("")
    await Promise.resolve()
    const organizerGranted = roles.includes("organizer")
    baseMembers.set(
      baseMembers.get().map((candidate) =>
        candidate.zitadelUserId === member.zitadelUserId
          ? {
              ...candidate,
              eventorenRole: organizerGranted ? "organizer" : "customer",
              organizerGranted,
              zitadelRoles: roles,
            }
          : candidate,
      ),
    )
    updatingMemberIds.set(updatingMemberIds.get().filter((id) => id !== member.zitadelUserId))
    editingMember.set(undefined)
    successMessage.set(text().saved)
  }

  const invitationFormat = (timestamp: string | undefined) => {
    if (!timestamp) return "—"
    const date = new Date(timestamp)
    if (Number.isNaN(date.valueOf())) return "—"
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Berlin",
    }).format(date)
  }

  return {
    availableRoles: () => adminAvailableRolesRead(baseMembers.get()),
    closeEdit,
    draftRoles,
    editingMember: editingMember.get,
    errorMessage,
    hasLoaded,
    invitationFormat,
    isLoading,
    isUpdating: (zitadelUserId) => updatingMemberIds.get().includes(zitadelUserId),
    members,
    openEdit,
    reload,
    roleFilter,
    saveRoles,
    search: search.get,
    searchChange,
    searchSubmit,
    successMessage: successMessage.get,
    text,
    total,
  }
}
