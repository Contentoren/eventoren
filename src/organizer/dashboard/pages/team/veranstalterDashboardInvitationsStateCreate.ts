import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { mutationCreate } from "#src/utils/convex_client/mutationCreate.ts"
import { queryPaginatedCreate } from "#src/utils/convex_client/queryPaginatedCreate.ts"
import { veranstalterDashboardRoleLabel } from "#src/organizer/dashboard/client/veranstalterDashboardRoleLabel.ts"
import type { OrganizerDashboardRole } from "#src/organizer/dashboard/model/organizerDashboardRoleSchema.ts"
import type { Id } from "#convex/_generated/dataModel.js"
import { organizerDashboardTeamFunctionReference } from "#src/organizer/dashboard/team/organizerDashboardTeamFunctionReference.ts"
import type { organizerDashboardTeamInvitationAcceptMutation } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationAcceptMutation.ts"
import type { organizerDashboardTeamInvitationInboxQuery } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationInboxQuery.ts"
import type { OrganizerDashboardTeamInvitationStatus } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationStatusSchema.ts"

const organizerDashboardInvitationsInboxReference = organizerDashboardTeamFunctionReference<
  typeof organizerDashboardTeamInvitationInboxQuery
>("organizerDashboardTeam:organizerDashboardTeamInvitationInboxQuery")

const organizerDashboardInvitationsAcceptReference = organizerDashboardTeamFunctionReference<
  typeof organizerDashboardTeamInvitationAcceptMutation
>("organizerDashboardTeam:organizerDashboardTeamInvitationAcceptMutation")

/**
 * State of the authenticated invitation inbox.
 *
 * The list is the live inbox of the signed-in account (the backend answers with
 * the invitations of the account e-mail). Accepting is an explicit action: no
 * mutation runs while the page is opened, the invitation id of the URL only
 * highlights a row.
 */
export function organizerDashboardInvitationsStateCreate(inputs: {
  readonly selectedInvitationId: () => string | undefined
}) {
  const paginated = queryPaginatedCreate(organizerDashboardInvitationsInboxReference, () => ({}), { pageSize: 25 })
  const accept = mutationCreate(organizerDashboardInvitationsAcceptReference)
  const accepting = createSignalObject(false)
  const error = createSignalObject<string | null>(null)
  const acceptedOrgName = createSignalObject<string | null>(null)

  const invitations = createMemo(() => {
    const result = paginated.result()
    if (!result || !result.success) return []
    return result.data
  })

  const listError = (): string | null => {
    const result = paginated.result()
    if (result && !result.success) return result.errorMessage
    return null
  }

  const accountEmail = createMemo<string | null>(() => {
    const first = paginated.pages()[0]
    if (!first || !first.success) return null
    return first.data.accountEmail
  })

  const isEmpty = (): boolean => listError() === null && invitations().length === 0

  const acceptInvitation = async (invitationId: Id<"organizerDashboardTeamInvitations">): Promise<void> => {
    if (accepting.get()) return
    accepting.set(true)
    error.set(null)
    acceptedOrgName.set(null)
    try {
      const result = await accept({ invitationId })
      if (!result.success) {
        error.set(result.errorMessage)
        return
      }
      const invitation = invitations().find((entry) => entry.id === invitationId)
      acceptedOrgName.set(invitation?.orgName ?? null)
    } finally {
      accepting.set(false)
    }
  }

  const roleLabel = (role: OrganizerDashboardRole): string => veranstalterDashboardRoleLabel(role).label

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

  const expiresAtLabel = (value: string): string =>
    new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(
      new Date(value),
    ) + " (Europe/Berlin)"

  return {
    invitations,
    accountEmail,
    listError,
    isEmpty,
    isLoading: paginated.isLoading,
    isDone: paginated.isDone,
    loadMore: paginated.loadMore,
    selectedInvitationId: inputs.selectedInvitationId,
    accepting: accepting.get,
    error: error.get,
    acceptedOrgName: acceptedOrgName.get,
    acceptInvitation,
    roleLabel,
    statusLabel,
    expiresAtLabel,
  }
}

export type VeranstalterDashboardInvitationsState = ReturnType<typeof organizerDashboardInvitationsStateCreate>
