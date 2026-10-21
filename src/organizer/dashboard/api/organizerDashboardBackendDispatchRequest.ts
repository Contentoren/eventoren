import type { Result } from "#result"
import type {
  OrganizerDashboardHttpBackend,
  OrganizerDashboardPaginationOpts,
} from "./organizerDashboardConvexBackendCreate.ts"
import type { OrganizerDashboardRequest } from "./organizerDashboardRequestParse.ts"

function organizerDashboardPaginationOptsCreate(args: {
  readonly numItems?: number | undefined
  readonly cursor?: string | null | undefined
  readonly endCursor?: string | null | undefined
}): OrganizerDashboardPaginationOpts {
  return {
    numItems: args.numItems ?? 25,
    cursor: args.cursor ?? null,
    ...(args.endCursor !== undefined && args.endCursor !== null ? { endCursor: args.endCursor } : {}),
  }
}

/**
 * Dispatches one validated interface request to the matching backend method.
 * Shared by the Hono route and the CLI so both surfaces forward identical
 * args for every allowlisted operation.
 */
export function organizerDashboardBackendDispatchRequest(
  backend: OrganizerDashboardHttpBackend,
  token: string,
  request: OrganizerDashboardRequest,
): Promise<Result<unknown>> {
  switch (request.operation) {
    case "order-list": {
      const { numItems, cursor, endCursor, ...filter } = request.args
      return backend.orderList({
        token,
        ...filter,
        paginationOpts: organizerDashboardPaginationOptsCreate({ numItems, cursor, endCursor }),
      })
    }
    case "order-participant-list": {
      const { numItems, cursor, endCursor, ...filter } = request.args
      return backend.orderParticipantList({
        token,
        ...filter,
        paginationOpts: organizerDashboardPaginationOptsCreate({ numItems, cursor, endCursor }),
      })
    }
    case "finance-overview":
      return backend.financeOverview({ token, ...request.args })
    case "settlement-get":
      return backend.settlementGet({ token, ...request.args })
    case "payout-list": {
      const { numItems, cursor, endCursor, ...filter } = request.args
      return backend.payoutList({
        token,
        ...filter,
        paginationOpts: organizerDashboardPaginationOptsCreate({ numItems, cursor, endCursor }),
      })
    }
    case "payout-record":
      return backend.payoutRecord({ token, ...request.args })
    case "order-get":
      return backend.orderGet({ token, ...request.args })
    case "order-note-create":
      return backend.orderNoteCreate({ token, ...request.args })
    case "order-note-delete":
      return backend.orderNoteDelete({ token, ...request.args })
    case "order-buyer-contact-update":
      return backend.orderBuyerContactUpdate({ token, ...request.args })
    case "order-participant-update":
      return backend.orderParticipantUpdate({ token, ...request.args })
    case "team-member-list":
      return backend.teamMemberList({
        token,
        orgId: request.args.orgId,
        paginationOpts: organizerDashboardPaginationOptsCreate(request.args),
      })
    case "team-invitation-list":
      return backend.teamInvitationList({
        token,
        orgId: request.args.orgId,
        paginationOpts: organizerDashboardPaginationOptsCreate(request.args),
      })
    case "team-invite":
      return backend.teamInvite({ token, ...request.args })
    case "team-role-update":
      return backend.teamRoleUpdate({ token, ...request.args })
    case "team-member-remove":
      return backend.teamMemberRemove({ token, ...request.args })
    case "team-invitation-revoke":
      return backend.teamInvitationRevoke({ token, ...request.args })
    case "team-invitation-resend":
      return backend.teamInvitationResend({ token, ...request.args })
    case "team-invitation-inbox":
      return backend.teamInvitationInbox({
        token,
        paginationOpts: organizerDashboardPaginationOptsCreate(request.args),
      })
    case "team-invitation-accept":
      return backend.teamInvitationAccept({ token, ...request.args })
    case "context":
      return backend.contextQuery({
        token,
        ...(request.args.orgId !== undefined ? { orgId: request.args.orgId } : {}),
      })
    case "create": {
      const args = request.args
      return backend.organizationCreate({
        token,
        name: args.name,
        slug: args.slug,
        kind: args.kind,
        ...(args.contactEmail !== undefined ? { contactEmail: args.contactEmail } : {}),
        ...(args.contactPhone !== undefined ? { contactPhone: args.contactPhone } : {}),
        ...(args.imprint !== undefined ? { imprint: args.imprint } : {}),
        ...(args.iban !== undefined ? { iban: args.iban } : {}),
        ...(args.bankHolder !== undefined ? { bankHolder: args.bankHolder } : {}),
        termsRevision: args.termsRevision,
        dpaRevision: args.dpaRevision,
        termsAccepted: args.termsAccepted,
        dpaAccepted: args.dpaAccepted,
      })
    }
    case "update": {
      const args = request.args
      return backend.organizationUpdate({
        token,
        orgId: args.orgId,
        ...(args.name !== undefined ? { name: args.name } : {}),
        ...(args.kind !== undefined ? { kind: args.kind } : {}),
        ...(args.contactEmail !== undefined ? { contactEmail: args.contactEmail } : {}),
        ...(args.contactPhone !== undefined ? { contactPhone: args.contactPhone } : {}),
        ...(args.imprint !== undefined ? { imprint: args.imprint } : {}),
        ...(args.iban !== undefined ? { iban: args.iban } : {}),
        ...(args.bankHolder !== undefined ? { bankHolder: args.bankHolder } : {}),
      })
    }
    case "organization-get":
      return backend.organizationGet({ token, orgId: request.args.orgId })
    case "contracts-accept":
      return backend.contractsAccept({
        token,
        orgId: request.args.orgId,
        termsAccepted: request.args.termsAccepted,
        dpaAccepted: request.args.dpaAccepted,
        termsRevision: request.args.termsRevision,
        dpaRevision: request.args.dpaRevision,
      })
    case "event-list": {
      const args = request.args
      return backend.eventList({
        token,
        orgId: args.orgId,
        ...(args.status !== undefined ? { status: args.status } : {}),
        ...(args.search !== undefined ? { search: args.search } : {}),
        ...(args.sort !== undefined ? { sort: args.sort } : {}),
        ...(args.fromStartsAt !== undefined ? { fromStartsAt: args.fromStartsAt } : {}),
        ...(args.toStartsAt !== undefined ? { toStartsAt: args.toStartsAt } : {}),
        paginationOpts: organizerDashboardPaginationOptsCreate(args),
      })
    }
    case "event-get":
      return backend.eventGet({ token, orgId: request.args.orgId, eventKey: request.args.eventKey })
    case "event-create": {
      const { orgId: _createOrgId, ...fields } = request.args
      return backend.eventCreate({ token, orgId: request.args.orgId, ...fields })
    }
    case "event-update": {
      const { orgId: _updateOrgId, eventKey: _updateKey, ...fields } = request.args
      return backend.eventUpdate({ token, orgId: request.args.orgId, eventKey: request.args.eventKey, ...fields })
    }
    case "event-publish":
      return backend.eventPublish({ token, orgId: request.args.orgId, eventKey: request.args.eventKey })
    case "event-archive":
      return backend.eventArchive({ token, orgId: request.args.orgId, eventKey: request.args.eventKey })
    case "tier-upsert": {
      const { orgId: _upsertOrgId, eventKey: _upsertKey, ...fields } = request.args
      return backend.tierUpsert({ token, orgId: request.args.orgId, eventKey: request.args.eventKey, ...fields })
    }
    case "tier-archive":
      return backend.tierArchive({
        token,
        orgId: request.args.orgId,
        eventKey: request.args.eventKey,
        tierKey: request.args.tierKey,
      })
    case "admin-list":
      return backend.adminList({
        token,
        ...(request.args.status !== undefined ? { status: request.args.status } : {}),
        paginationOpts: organizerDashboardPaginationOptsCreate(request.args),
      })
    case "admin-detail":
      return backend.adminDetail({ token, orgId: request.args.orgId })
    case "admin-configure":
      return backend.adminConfigure({
        token,
        orgId: request.args.orgId,
        tax: { status: request.args.tax.status, defaultRateBps: request.args.tax.defaultRateBps },
        fee: {
          percentBps: request.args.fee.percentBps,
          fixedCents: request.args.fee.fixedCents,
          payer: request.args.fee.payer,
        },
      })
    case "admin-approve":
      return backend.adminApprove({ token, orgId: request.args.orgId })
    case "admin-block":
      return backend.adminBlock({ token, orgId: request.args.orgId, reason: request.args.reason })
    case "admin-unblock":
      return backend.adminUnblock({ token, orgId: request.args.orgId, status: request.args.status })
    case "migration-plan":
      return backend.migrationPlan({ token, paginationOpts: organizerDashboardPaginationOptsCreate(request.args) })
    case "migration-apply":
      return backend.migrationApply({
        token,
        orgInits: request.args.orgInits.map((entry) => ({ orgId: entry.orgId, kind: entry.kind })),
        eventAssignments: request.args.eventAssignments.map((entry) => ({
          eventKey: entry.eventKey,
          orgId: entry.orgId,
        })),
        roleAssignments: request.args.roleAssignments.map((entry) => ({
          userId: entry.userId,
          orgId: entry.orgId,
          role: entry.role,
        })),
        scannerLinkApprovals: request.args.scannerLinkApprovals.map((entry) => ({
          linkId: entry.linkId,
          eventKey: entry.eventKey,
          orgId: entry.orgId,
        })),
      })
    case "migration-backfill":
      return backend.migrationBackfill({
        token,
        eventKey: request.args.eventKey,
        ...(request.args.cursor !== undefined && request.args.cursor !== null ? { cursor: request.args.cursor } : {}),
        ...(request.args.pageSize !== undefined ? { pageSize: request.args.pageSize } : {}),
      })
  }
}
