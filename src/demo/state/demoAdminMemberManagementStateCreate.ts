import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { language } from "../../app/i18n/language.ts"
import { languageSignal } from "../../app/i18n/languageSignal.ts"
import type { AdminMemberManagementState } from "../../admin/AdminMemberManagementState.ts"
import type { AdminZitadelMember } from "../../admin/AdminZitadelMember.ts"
import { adminMemberManagementText } from "../../admin/adminMemberManagementText.ts"
import { demoAdminMembers } from "../fixtures/demoAdminMembers.ts"

export function demoAdminMemberManagementStateCreate(
  scenario: "populated" | "empty" | "error" = "populated",
): AdminMemberManagementState {
  const members = createSignalObject<readonly AdminZitadelMember[]>(scenario === "empty" ? [] : demoAdminMembers)
  const total = createSignalObject(members.get().length)
  const search = createSignalObject("")
  const isLoading = createSignalObject(false)
  const updatingMemberIds = createSignalObject<readonly string[]>([])
  const errorMessage = createSignalObject(scenario === "error" ? "Die Mitglieder konnten nicht geladen werden." : "")
  const successMessage = createSignalObject("")
  const text = createMemo(adminMemberManagementText)

  const reload = async () => {
    if (scenario === "error") {
      members.set([])
      total.set(0)
      errorMessage.set(text().loadError)
      successMessage.set("")
      return
    }

    isLoading.set(true)
    errorMessage.set("")
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
    members.set(filtered)
    total.set(filtered.length)
    isLoading.set(false)
  }

  const searchChange = (value: string) => search.set(value)
  const searchSubmit = async () => reload()

  const roleChange = async (member: AdminZitadelMember) => {
    updatingMemberIds.set([...updatingMemberIds.get(), member.zitadelUserId])
    errorMessage.set("")
    successMessage.set("")
    await Promise.resolve()
    const organizerGranted = !member.organizerGranted
    const zitadelRoles: AdminZitadelMember["zitadelRoles"] = organizerGranted
      ? Array.from(new Set<"customer" | "organizer" | "admin">([...member.zitadelRoles, "organizer"]))
      : member.zitadelRoles.filter((role) => role !== "organizer")
    members.set(
      members.get().map((candidate) =>
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
    const locale = languageSignal.get() === language.de ? "de-DE" : "en-GB"
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date)
  }

  return {
    errorMessage: errorMessage.get,
    invitationFormat,
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
