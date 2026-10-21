import { createResult } from "#result"
import type { OrganizerDashboardHttpBackend } from "./organizerDashboardConvexBackendCreate.ts"

/**
 * Mock backend for the organizer dashboard interface tests. It records every
 * dispatched call so HTTP, CLI, and TS client surfaces can be compared, and
 * lets a single operation be overridden per test.
 */
export function organizerDashboardMockBackendCreate(behavior?: Partial<OrganizerDashboardHttpBackend>): {
  backend: OrganizerDashboardHttpBackend
  calls: unknown[]
} {
  const calls: unknown[] = []
  const record = <TArgs>(operation: string, args: TArgs): void => {
    calls.push({ operation, args })
  }
  return {
    calls,
    backend: {
      orderList: async (args) => {
        record("order-list", args)
        return behavior?.orderList?.(args) ?? createResult({ page: [], isDone: true, continueCursor: "" })
      },
      orderGet: async (args) => {
        record("order-get", args)
        return behavior?.orderGet?.(args) ?? createResult({ orderId: args.orderId })
      },
      orderNoteCreate: async (args) => {
        record("order-note-create", args)
        return behavior?.orderNoteCreate?.(args) ?? createResult({ noteId: "note_test" })
      },
      orderNoteDelete: async (args) => {
        record("order-note-delete", args)
        return behavior?.orderNoteDelete?.(args) ?? createResult({ noteId: args.noteId })
      },
      orderBuyerContactUpdate: async (args) => {
        record("order-buyer-contact-update", args)
        return behavior?.orderBuyerContactUpdate?.(args) ?? createResult({ orderId: args.orderId })
      },
      orderParticipantUpdate: async (args) => {
        record("order-participant-update", args)
        return behavior?.orderParticipantUpdate?.(args) ?? createResult({ ticketId: args.ticketId })
      },
      orderParticipantList: async (args) => {
        record("order-participant-list", args)
        return behavior?.orderParticipantList?.(args) ?? createResult({ page: [], isDone: true, continueCursor: "" })
      },
      teamMemberList: async (args) => {
        record("team-member-list", args)
        return behavior?.teamMemberList?.(args) ?? createResult({ page: [], isDone: true, continueCursor: "" })
      },
      teamInvitationList: async (args) => {
        record("team-invitation-list", args)
        return behavior?.teamInvitationList?.(args) ?? createResult({ page: [], isDone: true, continueCursor: "" })
      },
      teamInvite: async (args) => {
        record("team-invite", args)
        return behavior?.teamInvite?.(args) ?? createResult({ invitations: [] })
      },
      teamRoleUpdate: async (args) => {
        record("team-role-update", args)
        return behavior?.teamRoleUpdate?.(args) ?? createResult({ memberId: args.memberId })
      },
      teamMemberRemove: async (args) => {
        record("team-member-remove", args)
        return behavior?.teamMemberRemove?.(args) ?? createResult({ memberId: args.memberId })
      },
      teamInvitationRevoke: async (args) => {
        record("team-invitation-revoke", args)
        return behavior?.teamInvitationRevoke?.(args) ?? createResult({ invitationId: args.invitationId })
      },
      teamInvitationResend: async (args) => {
        record("team-invitation-resend", args)
        return behavior?.teamInvitationResend?.(args) ?? createResult({ invitationId: args.invitationId })
      },
      teamInvitationInbox: async (args) => {
        record("team-invitation-inbox", args)
        return (
          behavior?.teamInvitationInbox?.(args) ??
          createResult({ page: [], isDone: true, continueCursor: "", accountEmail: null })
        )
      },
      teamInvitationAccept: async (args) => {
        record("team-invitation-accept", args)
        return (
          behavior?.teamInvitationAccept?.(args) ??
          createResult({ memberId: "member_test", orgId: "org_test", organizerRole: "eventmanager" })
        )
      },
      contextQuery: async (args) => {
        record("context", args)
        return behavior?.contextQuery?.(args) ?? createResult({ organizations: [], activeOrganization: null })
      },
      organizationCreate: async (args) => {
        record("create", args)
        return behavior?.organizationCreate?.(args) ?? createResult({ orgId: "org_test" as never })
      },
      organizationUpdate: async (args) => {
        record("update", args)
        return behavior?.organizationUpdate?.(args) ?? createResult({ orgId: "org_test" as never })
      },
      organizationGet: async (args) => {
        record("organization-get", args)
        return behavior?.organizationGet?.(args) ?? createResult({ orgId: "org_test" as never })
      },
      contractsAccept: async (args) => {
        record("contracts-accept", args)
        return behavior?.contractsAccept?.(args) ?? createResult({ orgId: "org_test" as never })
      },
      eventList: async (args) => {
        record("event-list", args)
        return behavior?.eventList?.(args) ?? createResult({ page: [], isDone: true, continueCursor: "" })
      },
      eventGet: async (args) => {
        record("event-get", args)
        return behavior?.eventGet?.(args) ?? createResult({ eventKey: "event-test" as never })
      },
      eventCreate: async (args) => {
        record("event-create", args)
        return behavior?.eventCreate?.(args) ?? createResult({ eventKey: "event-test" as never })
      },
      eventUpdate: async (args) => {
        record("event-update", args)
        return behavior?.eventUpdate?.(args) ?? createResult({ eventKey: "event-test" as never })
      },
      eventPublish: async (args) => {
        record("event-publish", args)
        return behavior?.eventPublish?.(args) ?? createResult({ eventKey: "event-test" as never })
      },
      eventArchive: async (args) => {
        record("event-archive", args)
        return behavior?.eventArchive?.(args) ?? createResult({ eventKey: "event-test" as never })
      },
      tierUpsert: async (args) => {
        record("tier-upsert", args)
        return behavior?.tierUpsert?.(args) ?? createResult({ tierKey: "tier-test" as never })
      },
      tierArchive: async (args) => {
        record("tier-archive", args)
        return behavior?.tierArchive?.(args) ?? createResult({ tierKey: "tier-test" as never })
      },
      adminList: async (args) => {
        record("admin-list", args)
        return behavior?.adminList?.(args) ?? createResult({ page: [], isDone: true, continueCursor: "" })
      },
      adminDetail: async (args) => {
        record("admin-detail", args)
        return behavior?.adminDetail?.(args) ?? createResult({ orgId: "org_test" as never })
      },
      adminConfigure: async (args) => {
        record("admin-configure", args)
        return behavior?.adminConfigure?.(args) ?? createResult({ orgId: "org_test" as never })
      },
      adminApprove: async (args) => {
        record("admin-approve", args)
        return behavior?.adminApprove?.(args) ?? createResult({ orgId: "org_test" as never })
      },
      adminBlock: async (args) => {
        record("admin-block", args)
        return behavior?.adminBlock?.(args) ?? createResult({ orgId: "org_test" as never })
      },
      adminUnblock: async (args) => {
        record("admin-unblock", args)
        return behavior?.adminUnblock?.(args) ?? createResult({ orgId: "org_test" as never })
      },
      migrationPlan: async (args) => {
        record("migration-plan", args)
        return behavior?.migrationPlan?.(args) ?? createResult({ page: [], isDone: true, continueCursor: "" })
      },
      migrationApply: async (args) => {
        record("migration-apply", args)
        return (
          behavior?.migrationApply?.(args) ?? createResult({ orgsInitialized: 0, eventsAssigned: 0, rolesAssigned: 0 })
        )
      },
      migrationBackfill: async (args) => {
        record("migration-backfill", args)
        return behavior?.migrationBackfill?.(args) ?? createResult({ scanned: 0, changed: 0, isDone: true })
      },
      financeOverview: async (args) => {
        record("finance-overview", args)
        return behavior?.financeOverview?.(args) ?? createResult({ events: [], salesCurve: [] })
      },
      settlementGet: async (args) => {
        record("settlement-get", args)
        return behavior?.settlementGet?.(args) ?? createResult({ eventKey: args.eventKey })
      },
      payoutList: async (args) => {
        record("payout-list", args)
        return behavior?.payoutList?.(args) ?? createResult({ page: [], isDone: true, continueCursor: "" })
      },
      payoutRecord: async (args) => {
        record("payout-record", args)
        return behavior?.payoutRecord?.(args) ?? createResult({ payoutId: "payout_test" })
      },
    },
  }
}

export type OrganizerDashboardMockBackend = ReturnType<typeof organizerDashboardMockBackendCreate>
