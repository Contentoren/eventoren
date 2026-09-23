import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { AdminMemberManagementState } from "../../admin/AdminMemberManagementState.ts"
import type { AdminZitadelMember } from "../../admin/AdminZitadelMember.ts"
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
  const roleFilter = createSignalObject<readonly ("admin" | "organizer")[]>([])
  const updatingMemberIds = createSignalObject<readonly string[]>([])
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
    if (selected.length === 0) return baseMembers.get()
    return baseMembers.get().filter((member) => selected.some((role) => member.zitadelRoles.includes(role)))
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

  const roleChange = async (member: AdminZitadelMember) => {
    updatingMemberIds.set([...updatingMemberIds.get(), member.zitadelUserId])
    baseErrorMessage.set("")
    successMessage.set("")
    await Promise.resolve()
    const organizerGranted = !member.organizerGranted
    const zitadelRoles: AdminZitadelMember["zitadelRoles"] = organizerGranted
      ? Array.from(new Set<"customer" | "organizer" | "admin">([...member.zitadelRoles, "organizer"]))
      : member.zitadelRoles.filter((role) => role !== "organizer")
    baseMembers.set(
      baseMembers.get().map((candidate) =>
        candidate.zitadelUserId === member.zitadelUserId
          ? {
              ...candidate,
              eventorenRole: organizerGranted ? "organizer" : "customer",
              organizerGranted,
              zitadelRoles,
            }
          : candidate,
      ),
    )
    updatingMemberIds.set(updatingMemberIds.get().filter((id) => id !== member.zitadelUserId))
    successMessage.set(organizerGranted ? text().granted : text().revoked)
  }

  const invitationFormat = (timestamp: string | undefined) => {
    if (!timestamp) return "—"
    const date = new Date(timestamp)
    if (Number.isNaN(date.valueOf())) return "—"
    return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(date)
  }

  return {
    errorMessage,
    hasLoaded,
    invitationFormat,
    isLoading,
    isUpdating: (zitadelUserId) => updatingMemberIds.get().includes(zitadelUserId),
    members,
    reload,
    roleChange,
    roleFilter: roleFilter.get,
    roleFilterToggle: (role) =>
      roleFilter.set(
        roleFilter.get().includes(role)
          ? roleFilter.get().filter((value) => value !== role)
          : [...roleFilter.get(), role],
      ),
    search: search.get,
    searchChange,
    searchSubmit,
    successMessage: successMessage.get,
    text,
    total,
  }
}
