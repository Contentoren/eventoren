import { createMemo, createRenderEffect, untrack } from "solid-js"
import * as v from "valibot"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { mutationCreate } from "#src/utils/convex_client/mutationCreate.ts"
import { queryPaginatedCreate } from "#src/utils/convex_client/queryPaginatedCreate.ts"
import type { Id } from "#convex/_generated/dataModel.js"
import { veranstalterDashboardRoleLabel } from "#src/organizer/dashboard/client/veranstalterDashboardRoleLabel.ts"
import { organizerDashboardRoleSchema } from "#src/organizer/dashboard/model/organizerDashboardRoleSchema.ts"
import type { OrganizerDashboardRole } from "#src/organizer/dashboard/model/organizerDashboardRoleSchema.ts"
import { organizerDashboardTeamFunctionReference } from "#src/organizer/dashboard/team/organizerDashboardTeamFunctionReference.ts"
import type { organizerDashboardTeamInvitationListQuery } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationListQuery.ts"
import type { organizerDashboardTeamInvitationResendMutation } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationResendMutation.ts"
import type { organizerDashboardTeamInvitationRevokeMutation } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationRevokeMutation.ts"
import type { organizerDashboardTeamInviteMutation } from "#src/organizer/dashboard/team/organizerDashboardTeamInviteMutation.ts"
import type { organizerDashboardTeamMemberListQuery } from "#src/organizer/dashboard/team/organizerDashboardTeamMemberListQuery.ts"
import type { organizerDashboardTeamMemberRemoveMutation } from "#src/organizer/dashboard/team/organizerDashboardTeamMemberRemoveMutation.ts"
import type { organizerDashboardTeamRoleUpdateMutation } from "#src/organizer/dashboard/team/organizerDashboardTeamRoleUpdateMutation.ts"
import type { OrganizerDashboardTeamDeliveryState } from "#src/organizer/dashboard/team/organizerDashboardTeamDeliveryStateSchema.ts"
import type { OrganizerDashboardTeamInvitationStatus } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationStatusSchema.ts"

const organizerDashboardTeamMemberListReference = organizerDashboardTeamFunctionReference<
  typeof organizerDashboardTeamMemberListQuery
>("organizerDashboardTeam:organizerDashboardTeamMemberListQuery")

const organizerDashboardTeamInvitationListReference = organizerDashboardTeamFunctionReference<
  typeof organizerDashboardTeamInvitationListQuery
>("organizerDashboardTeam:organizerDashboardTeamInvitationListQuery")

const organizerDashboardTeamInviteReference = organizerDashboardTeamFunctionReference<
  typeof organizerDashboardTeamInviteMutation
>("organizerDashboardTeam:organizerDashboardTeamInviteMutation")

const organizerDashboardTeamRoleUpdateReference = organizerDashboardTeamFunctionReference<
  typeof organizerDashboardTeamRoleUpdateMutation
>("organizerDashboardTeam:organizerDashboardTeamRoleUpdateMutation")

const organizerDashboardTeamMemberRemoveReference = organizerDashboardTeamFunctionReference<
  typeof organizerDashboardTeamMemberRemoveMutation
>("organizerDashboardTeam:organizerDashboardTeamMemberRemoveMutation")

const organizerDashboardTeamInvitationRevokeReference = organizerDashboardTeamFunctionReference<
  typeof organizerDashboardTeamInvitationRevokeMutation
>("organizerDashboardTeam:organizerDashboardTeamInvitationRevokeMutation")

const organizerDashboardTeamInvitationResendReference = organizerDashboardTeamFunctionReference<
  typeof organizerDashboardTeamInvitationResendMutation
>("organizerDashboardTeam:organizerDashboardTeamInvitationResendMutation")

export type OrganizerDashboardTeamDialog = "einladen" | "entfernen" | "rolle"

/**
 * State of the team page.
 *
 * The two lists are live and bounded (paginated queries), every write goes
 * through the real team mutations, and the open dialog lives in the URL. The
 * delivery state of an invitation is reported as it is stored: a mail that was
 * not handed over to a provider is never shown as sent.
 */
export function organizerDashboardTeamStateCreate(inputs: {
  readonly orgId: () => string | undefined
  readonly canManage: () => boolean
  readonly dialog: () => OrganizerDashboardTeamDialog | undefined
  readonly memberId: () => string | undefined
  readonly openDialog: (dialog: OrganizerDashboardTeamDialog, memberId?: string) => void
  readonly closeDialog: () => void
}) {
  const members = queryPaginatedCreate(
    organizerDashboardTeamMemberListReference,
    () => {
      if (!inputs.canManage()) return undefined
      const orgId = inputs.orgId()
      if (!orgId) return undefined
      return { orgId: orgId as Id<"orgs"> }
    },
    { pageSize: 25 },
  )
  const invitations = queryPaginatedCreate(
    organizerDashboardTeamInvitationListReference,
    () => {
      if (!inputs.canManage()) return undefined
      const orgId = inputs.orgId()
      if (!orgId) return undefined
      return { orgId: orgId as Id<"orgs"> }
    },
    { pageSize: 25 },
  )
  const invite = mutationCreate(organizerDashboardTeamInviteReference)
  const roleUpdate = mutationCreate(organizerDashboardTeamRoleUpdateReference)
  const memberRemove = mutationCreate(organizerDashboardTeamMemberRemoveReference)
  const revoke = mutationCreate(organizerDashboardTeamInvitationRevokeReference)
  const resend = mutationCreate(organizerDashboardTeamInvitationResendReference)

  const inviteEmail = createSignalObject("")
  const inviteRole = createSignalObject("eventmanager")
  const roleSelection = createSignalObject("")
  const submitting = createSignalObject(false)
  const error = createSignalObject<string | null>(null)
  const message = createSignalObject<string | null>(null)

  const roleSeed = createSignalObject<string | null>(null)
  let scopeGeneration = 0
  let dialogGeneration = 0
  let previousOrgId: string | undefined
  let previousCouldManage: boolean | undefined
  createRenderEffect(() => {
    const orgId = inputs.orgId()
    const canManage = inputs.canManage()
    untrack(() => {
      scopeGeneration += 1
      // A live context reload briefly drops both values to unknown; that must
      // never look like leaving the org or losing the permission.
      const orgChanged = previousOrgId !== undefined && orgId !== undefined && previousOrgId !== orgId
      const manageLost = previousCouldManage === true && canManage !== true && orgId !== undefined
      if (orgChanged) {
        inviteEmail.set("")
        inviteRole.set("eventmanager")
        roleSelection.set("")
        roleSeed.set(null)
        error.set(null)
        message.set(null)
        submitting.set(false)
      }
      // Preserve an initial deep link, and never close a dialog merely because
      // permissions finished loading: only a new org or a lost team permission
      // may close it.
      if (orgChanged || manageLost) inputs.closeDialog()
      previousOrgId = orgId
      previousCouldManage = canManage
    })
  })
  createRenderEffect(() => {
    inputs.orgId()
    inputs.dialog()
    inputs.memberId()
    untrack(() => {
      dialogGeneration += 1
      roleSeed.set(null)
    })
  })

  const inviteRoleValue = createMemo<OrganizerDashboardRole>(() => {
    const parsed = v.safeParse(organizerDashboardRoleSchema, inviteRole.get())
    return parsed.success ? parsed.output : "eventmanager"
  })

  const memberRows = createMemo(() => {
    const result = members.result()
    if (!result || !result.success) return []
    return result.data
  })

  const invitationRows = createMemo(() => {
    const result = invitations.result()
    if (!result || !result.success) return []
    return result.data
  })

  const memberListError = (): string | null => {
    const result = members.result()
    if (result && !result.success) return result.errorMessage
    return null
  }

  const invitationListError = (): string | null => {
    const result = invitations.result()
    if (result && !result.success) return result.errorMessage
    return null
  }

  const isMembersEmpty = (): boolean => memberListError() === null && memberRows().length === 0
  const isInvitationsEmpty = (): boolean => invitationListError() === null && invitationRows().length === 0

  const selectedMember = createMemo(() => memberRows().find((member) => member.id === inputs.memberId()))
  const roleIdentity = () => JSON.stringify([inputs.orgId(), inputs.memberId()])
  createRenderEffect(() => {
    const member = selectedMember()
    const dialog = inputs.dialog()
    const identity = roleIdentity()
    if (dialog !== "rolle" || !member) return
    untrack(() => {
      if (roleSeed.get() === identity) return
      roleSelection.set(member.organizerRole ?? "")
      roleSeed.set(identity)
    })
  })
  const canSubmitRole = () =>
    inputs.canManage() &&
    inputs.dialog() === "rolle" &&
    selectedMember() !== undefined &&
    roleSeed.get() === roleIdentity()
  const canSubmitRemove = () => inputs.canManage() && inputs.dialog() === "entfernen" && selectedMember() !== undefined
  const selectedMemberFeedback = () =>
    selectedMember()
      ? null
      : "Das ausgewählte Mitglied ist noch nicht geladen oder nicht mehr verfügbar. Lade bei Bedarf weitere Mitglieder; ohne geladenes Ziel wird nichts geändert."

  const openInviteDialog = (): void => {
    error.set(null)
    message.set(null)
    inputs.openDialog("einladen")
  }

  const openRoleDialog = (memberId: string): void => {
    error.set(null)
    message.set(null)
    inputs.openDialog("rolle", memberId)
  }

  const openRemoveDialog = (memberId: string): void => {
    error.set(null)
    message.set(null)
    inputs.openDialog("entfernen", memberId)
  }

  const closeDialog = (): void => {
    error.set(null)
    inputs.closeDialog()
  }

  const submitInvite = async (): Promise<void> => {
    if (submitting.get()) return
    const orgId = inputs.orgId()
    if (!orgId || !inputs.canManage() || inputs.dialog() !== "einladen") return
    const generation = scopeGeneration
    const dialogVersion = dialogGeneration
    const email = inviteEmail.get().trim()
    if (email.length === 0) {
      error.set("Bitte eine E-Mail-Adresse angeben.")
      return
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(email)) {
      error.set("Bitte gib eine gültige E-Mail-Adresse ein.")
      return
    }
    submitting.set(true)
    error.set(null)
    message.set(null)
    try {
      const roleParsed = v.safeParse(organizerDashboardRoleSchema, inviteRole.get())
      if (!roleParsed.success) {
        error.set(roleParsed.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
        return
      }
      const result = await invite({
        orgId: orgId as Id<"orgs">,
        emails: [email],
        organizerRole: roleParsed.output,
      })
      if (generation !== scopeGeneration || dialogVersion !== dialogGeneration) return
      if (!result.success) {
        error.set(result.errorMessage)
        return
      }
      inviteEmail.set("")
      message.set("Die Einladung wurde angelegt.")
      inputs.closeDialog()
    } finally {
      if (generation === scopeGeneration) submitting.set(false)
    }
  }

  const submitRole = async (): Promise<void> => {
    if (submitting.get()) return
    const orgId = inputs.orgId()
    const memberId = inputs.memberId()
    if (!orgId || !memberId || !canSubmitRole()) {
      error.set("Das ausgewählte Mitglied muss vor dem Speichern geladen sein.")
      return
    }
    const generation = scopeGeneration
    const dialogVersion = dialogGeneration
    submitting.set(true)
    error.set(null)
    message.set(null)
    try {
      const selection = roleSelection.get()
      const parsed = selection === "" ? null : v.safeParse(organizerDashboardRoleSchema, selection)
      if (parsed && !parsed.success) {
        error.set(parsed.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
        return
      }
      const result = await roleUpdate({
        orgId: orgId as Id<"orgs">,
        memberId: memberId as Id<"orgMembers">,
        organizerRole: parsed && parsed.success ? parsed.output : null,
      })
      if (generation !== scopeGeneration || dialogVersion !== dialogGeneration) return
      if (!result.success) {
        error.set(result.errorMessage)
        return
      }
      message.set("Die Teamrolle wurde geändert.")
      inputs.closeDialog()
    } finally {
      if (generation === scopeGeneration) submitting.set(false)
    }
  }

  const submitRemove = async (): Promise<void> => {
    if (submitting.get()) return
    const orgId = inputs.orgId()
    const memberId = inputs.memberId()
    if (!orgId || !memberId || !canSubmitRemove()) {
      error.set("Das ausgewählte Mitglied muss vor dem Entfernen geladen sein.")
      return
    }
    const generation = scopeGeneration
    const dialogVersion = dialogGeneration
    submitting.set(true)
    error.set(null)
    message.set(null)
    try {
      const result = await memberRemove({
        orgId: orgId as Id<"orgs">,
        memberId: memberId as Id<"orgMembers">,
      })
      if (generation !== scopeGeneration || dialogVersion !== dialogGeneration) return
      if (!result.success) {
        error.set(result.errorMessage)
        return
      }
      message.set("Die Person wurde aus dem Team entfernt. Die Mitgliedschaft bleibt erhalten.")
      inputs.closeDialog()
    } finally {
      if (generation === scopeGeneration) submitting.set(false)
    }
  }

  const revokeInvitation = async (invitationId: Id<"organizerDashboardTeamInvitations">): Promise<void> => {
    if (submitting.get()) return
    const orgId = inputs.orgId()
    if (!orgId || !inputs.canManage() || !invitationRows().some((row) => row.id === invitationId)) return
    const generation = scopeGeneration
    submitting.set(true)
    error.set(null)
    message.set(null)
    try {
      const result = await revoke({ orgId: orgId as Id<"orgs">, invitationId })
      if (generation !== scopeGeneration) return
      if (!result.success) {
        error.set(result.errorMessage)
        return
      }
      message.set("Die Einladung wurde widerrufen.")
    } finally {
      if (generation === scopeGeneration) submitting.set(false)
    }
  }

  const resendInvitation = async (invitationId: Id<"organizerDashboardTeamInvitations">): Promise<void> => {
    if (submitting.get()) return
    const orgId = inputs.orgId()
    if (!orgId || !inputs.canManage() || !invitationRows().some((row) => row.id === invitationId)) return
    const generation = scopeGeneration
    submitting.set(true)
    error.set(null)
    message.set(null)
    try {
      const result = await resend({ orgId: orgId as Id<"orgs">, invitationId })
      if (generation !== scopeGeneration) return
      if (!result.success) {
        error.set(result.errorMessage)
        return
      }
      message.set("Die Einladung wurde erneut zum Versand angemeldet.")
    } finally {
      if (generation === scopeGeneration) submitting.set(false)
    }
  }

  const roleLabel = (role: OrganizerDashboardRole): string => veranstalterDashboardRoleLabel(role).label
  const roleDescription = (role: OrganizerDashboardRole): string => veranstalterDashboardRoleLabel(role).description

  const membershipRoleLabel = (role: "member" | "guest"): string => (role === "guest" ? "Gast" : "Mitglied")

  const statusLabel = (status: OrganizerDashboardTeamInvitationStatus): string => {
    switch (status) {
      case "pending":
        return "offen"
      case "accepted":
        return "angenommen"
      case "revoked":
        return "widerrufen"
      case "expired":
        return "abgelaufen"
    }
  }

  const deliveryStateLabel = (state: OrganizerDashboardTeamDeliveryState): string => {
    switch (state) {
      case "queued":
        return "in der Warteschlange"
      case "sending":
        return "wird gesendet"
      case "sent":
        return "gesendet"
      case "failed":
        return "fehlgeschlagen"
      case "skipped":
        return "nicht gesendet"
    }
  }

  const berlinLabel = (value: string): string =>
    new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(
      new Date(value),
    ) + " (Europe/Berlin)"

  return {
    members: memberRows,
    invitations: invitationRows,
    memberListError,
    invitationListError,
    isMembersEmpty,
    isInvitationsEmpty,
    membersLoading: members.isLoading,
    membersDone: members.isDone,
    loadMoreMembers: members.loadMore,
    invitationsLoading: invitations.isLoading,
    invitationsDone: invitations.isDone,
    loadMoreInvitations: invitations.loadMore,
    canManage: inputs.canManage,
    dialog: inputs.dialog,
    selectedMember,
    selectedMemberFeedback,
    canSubmitRole,
    canSubmitRemove,
    inviteEmail: inviteEmail.get,
    inviteEmailChange: inviteEmail.set,
    inviteRole: inviteRole.get,
    inviteRoleChange: inviteRole.set,
    inviteRoleValue,
    roleSelection: roleSelection.get,
    roleSelectionChange: roleSelection.set,
    submitting: submitting.get,
    error: error.get,
    message: message.get,
    openInviteDialog,
    openRoleDialog,
    openRemoveDialog,
    closeDialog,
    submitInvite,
    submitRole,
    submitRemove,
    revokeInvitation,
    resendInvitation,
    roleLabel,
    roleDescription,
    membershipRoleLabel,
    statusLabel,
    deliveryStateLabel,
    berlinLabel,
  }
}

export type VeranstalterDashboardTeamState = ReturnType<typeof organizerDashboardTeamStateCreate>
