import type { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import type { Result } from "#result"
import type { CatalogEventFaqs } from "#src/catalog/catalogEventFaqsSchema.ts"
import type { CatalogEventSchedule } from "#src/catalog/catalogEventScheduleSchema.ts"
import type { OrganizerDashboardRequest } from "./organizerDashboardRequestParse.ts"
import { organizerDashboardGuestReferences } from "./organizerDashboardGuestReferences.ts"
import { organizerDashboardMessageReferences } from "./organizerDashboardMessageReferences.ts"
import { organizerDashboardTeamReferences } from "./organizerDashboardTeamReferences.ts"

type OrganizerDashboardTeamBackendArgs<Operation extends OrganizerDashboardRequest["operation"]> = {
  readonly token: string
} & Extract<OrganizerDashboardRequest, { operation: Operation }>["args"]

type OrganizerDashboardTeamBackendPageArgs<Operation extends OrganizerDashboardRequest["operation"]> = Omit<
  OrganizerDashboardTeamBackendArgs<Operation>,
  "numItems" | "cursor" | "endCursor"
> & { readonly paginationOpts: OrganizerDashboardPaginationOpts }

export type OrganizerDashboardPaginationOpts = {
  readonly numItems: number
  readonly cursor: string | null
  readonly endCursor?: string | null
}

export type OrganizerDashboardHttpBackend = {
  readonly orderList: (args: OrganizerDashboardTeamBackendPageArgs<"order-list">) => Promise<Result<unknown>>
  readonly orderGet: (args: OrganizerDashboardTeamBackendArgs<"order-get">) => Promise<Result<unknown>>
  readonly orderNoteCreate: (args: OrganizerDashboardTeamBackendArgs<"order-note-create">) => Promise<Result<unknown>>
  readonly orderNoteDelete: (args: OrganizerDashboardTeamBackendArgs<"order-note-delete">) => Promise<Result<unknown>>
  readonly orderBuyerContactUpdate: (
    args: OrganizerDashboardTeamBackendArgs<"order-buyer-contact-update">,
  ) => Promise<Result<unknown>>
  readonly orderParticipantUpdate: (
    args: OrganizerDashboardTeamBackendArgs<"order-participant-update">,
  ) => Promise<Result<unknown>>
  readonly orderParticipantList: (
    args: OrganizerDashboardTeamBackendPageArgs<"order-participant-list">,
  ) => Promise<Result<unknown>>
  readonly orderRefundRequest: (
    args: OrganizerDashboardTeamBackendArgs<"order-refund-request">,
  ) => Promise<Result<unknown>>
  readonly orderRefundStatus: (
    args: OrganizerDashboardTeamBackendArgs<"order-refund-status">,
  ) => Promise<Result<unknown>>
  readonly orderInvoiceStatus: (
    args: OrganizerDashboardTeamBackendArgs<"order-invoice-status">,
  ) => Promise<Result<unknown>>
  readonly orderInvoicePdf: (args: OrganizerDashboardTeamBackendArgs<"order-invoice-pdf">) => Promise<Result<unknown>>
  readonly orderInvoiceResend: (
    args: OrganizerDashboardTeamBackendArgs<"order-invoice-resend">,
  ) => Promise<Result<unknown>>
  readonly financeOverview: (args: OrganizerDashboardTeamBackendArgs<"finance-overview">) => Promise<Result<unknown>>
  readonly settlementGet: (args: OrganizerDashboardTeamBackendArgs<"settlement-get">) => Promise<Result<unknown>>
  readonly payoutList: (args: OrganizerDashboardTeamBackendPageArgs<"payout-list">) => Promise<Result<unknown>>
  readonly payoutRecord: (args: OrganizerDashboardTeamBackendArgs<"payout-record">) => Promise<Result<unknown>>
  readonly payoutStatusUpdate: (
    args: OrganizerDashboardTeamBackendArgs<"payout-status-update">,
  ) => Promise<Result<unknown>>
  readonly phaseList: (args: OrganizerDashboardTeamBackendArgs<"phase-list">) => Promise<Result<unknown>>
  readonly phaseUpsert: (args: OrganizerDashboardTeamBackendArgs<"phase-upsert">) => Promise<Result<unknown>>
  readonly phaseArchive: (args: OrganizerDashboardTeamBackendArgs<"phase-archive">) => Promise<Result<unknown>>
  readonly codeList: (args: OrganizerDashboardTeamBackendPageArgs<"code-list">) => Promise<Result<unknown>>
  readonly codeCreate: (args: OrganizerDashboardTeamBackendArgs<"code-create">) => Promise<Result<unknown>>
  readonly codeUpdate: (args: OrganizerDashboardTeamBackendArgs<"code-update">) => Promise<Result<unknown>>
  readonly codeDelete: (args: OrganizerDashboardTeamBackendArgs<"code-delete">) => Promise<Result<unknown>>
  readonly voucherList: (args: OrganizerDashboardTeamBackendPageArgs<"voucher-list">) => Promise<Result<unknown>>
  readonly voucherIssue: (args: OrganizerDashboardTeamBackendArgs<"voucher-issue">) => Promise<Result<unknown>>
  readonly voucherRedeem: (args: OrganizerDashboardTeamBackendArgs<"voucher-redeem">) => Promise<Result<unknown>>
  readonly voucherDeactivate: (
    args: OrganizerDashboardTeamBackendArgs<"voucher-deactivate">,
  ) => Promise<Result<unknown>>
  readonly teamMemberList: (args: OrganizerDashboardTeamBackendPageArgs<"team-member-list">) => Promise<Result<unknown>>
  readonly teamInvitationList: (
    args: OrganizerDashboardTeamBackendPageArgs<"team-invitation-list">,
  ) => Promise<Result<unknown>>
  readonly teamInvite: (args: OrganizerDashboardTeamBackendArgs<"team-invite">) => Promise<Result<unknown>>
  readonly teamRoleUpdate: (args: OrganizerDashboardTeamBackendArgs<"team-role-update">) => Promise<Result<unknown>>
  readonly teamMemberRemove: (args: OrganizerDashboardTeamBackendArgs<"team-member-remove">) => Promise<Result<unknown>>
  readonly teamInvitationRevoke: (
    args: OrganizerDashboardTeamBackendArgs<"team-invitation-revoke">,
  ) => Promise<Result<unknown>>
  readonly teamInvitationResend: (
    args: OrganizerDashboardTeamBackendArgs<"team-invitation-resend">,
  ) => Promise<Result<unknown>>
  readonly teamInvitationInbox: (
    args: OrganizerDashboardTeamBackendPageArgs<"team-invitation-inbox">,
  ) => Promise<Result<unknown>>
  readonly teamInvitationAccept: (
    args: OrganizerDashboardTeamBackendArgs<"team-invitation-accept">,
  ) => Promise<Result<unknown>>
  readonly guestQuotaList: (args: OrganizerDashboardTeamBackendArgs<"guest-quota-list">) => Promise<Result<unknown>>
  readonly guestQuotaUpsert: (args: OrganizerDashboardTeamBackendArgs<"guest-quota-upsert">) => Promise<Result<unknown>>
  readonly guestQuotaDelete: (args: OrganizerDashboardTeamBackendArgs<"guest-quota-delete">) => Promise<Result<unknown>>
  readonly guestList: (args: OrganizerDashboardTeamBackendArgs<"guest-list">) => Promise<Result<unknown>>
  readonly guestUpsert: (args: OrganizerDashboardTeamBackendArgs<"guest-upsert">) => Promise<Result<unknown>>
  readonly guestDelete: (args: OrganizerDashboardTeamBackendArgs<"guest-delete">) => Promise<Result<unknown>>
  readonly guestTicketSend: (args: OrganizerDashboardTeamBackendArgs<"guest-ticket-send">) => Promise<Result<unknown>>
  readonly guestCheckIn: (args: OrganizerDashboardTeamBackendArgs<"guest-check-in">) => Promise<Result<unknown>>
  readonly guestCheckInUndo: (
    args: OrganizerDashboardTeamBackendArgs<"guest-check-in-undo">,
  ) => Promise<Result<unknown>>
  readonly messageList: (args: OrganizerDashboardTeamBackendArgs<"message-list">) => Promise<Result<unknown>>
  readonly messageGet: (args: OrganizerDashboardTeamBackendArgs<"message-get">) => Promise<Result<unknown>>
  readonly messageCreate: (args: OrganizerDashboardTeamBackendArgs<"message-create">) => Promise<Result<unknown>>
  readonly messageUpdate: (args: OrganizerDashboardTeamBackendArgs<"message-update">) => Promise<Result<unknown>>
  readonly messageSchedule: (args: OrganizerDashboardTeamBackendArgs<"message-schedule">) => Promise<Result<unknown>>
  readonly messageSend: (args: OrganizerDashboardTeamBackendArgs<"message-send">) => Promise<Result<unknown>>
  readonly messageDelete: (args: OrganizerDashboardTeamBackendArgs<"message-delete">) => Promise<Result<unknown>>
  readonly messageIcsGet: (args: OrganizerDashboardTeamBackendArgs<"message-ics-get">) => Promise<Result<unknown>>
  readonly messageReminderGet: (
    args: OrganizerDashboardTeamBackendArgs<"message-reminder-get">,
  ) => Promise<Result<unknown>>
  readonly messageReminderUpdate: (
    args: OrganizerDashboardTeamBackendArgs<"message-reminder-update">,
  ) => Promise<Result<unknown>>
  readonly contextQuery: (args: { readonly token: string; readonly orgId?: string }) => Promise<Result<unknown>>
  readonly organizationCreate: (args: {
    readonly token: string
    readonly name: string
    readonly slug: string
    readonly kind: string
    readonly contactEmail?: string
    readonly contactPhone?: string
    readonly imprint?: string
    readonly iban?: string
    readonly bankHolder?: string
    readonly termsRevision: string
    readonly dpaRevision: string
    readonly termsAccepted: boolean
    readonly dpaAccepted: boolean
  }) => Promise<Result<unknown>>
  readonly organizationUpdate: (args: {
    readonly token: string
    readonly orgId: string
    readonly name?: string
    readonly kind?: string
    readonly contactEmail?: string
    readonly contactPhone?: string
    readonly imprint?: string
    readonly iban?: string
    readonly bankHolder?: string
  }) => Promise<Result<unknown>>
  readonly organizationGet: (args: { readonly token: string; readonly orgId: string }) => Promise<Result<unknown>>
  readonly contractsAccept: (args: {
    readonly token: string
    readonly orgId: string
    readonly termsAccepted: true
    readonly dpaAccepted: true
    readonly termsRevision: string
    readonly dpaRevision: string
  }) => Promise<Result<unknown>>
  readonly eventList: (args: {
    readonly token: string
    readonly orgId: string
    readonly status?: "draft" | "published" | "archived"
    readonly search?: string
    readonly sort?: "startsAtAsc" | "startsAtDesc"
    readonly fromStartsAt?: string
    readonly toStartsAt?: string
    readonly paginationOpts: OrganizerDashboardPaginationOpts
  }) => Promise<Result<unknown>>
  readonly eventGet: (args: {
    readonly token: string
    readonly orgId: string
    readonly eventKey: string
  }) => Promise<Result<unknown>>
  readonly eventCreate: (args: {
    readonly token: string
    readonly orgId: string
    readonly title: string
    readonly subtitle: string
    readonly description: string
    readonly category: string
    readonly startsAt: string
    readonly endsAt: string
    readonly doorsAt: string
    readonly bookingOpensAt?: string
    readonly venue: string
    readonly city: string
    readonly address: string
    readonly organizer: string
    readonly imageUrl: string
    readonly imageAlt: string
    readonly tags?: string[]
    readonly faqs?: CatalogEventFaqs
    readonly schedule?: CatalogEventSchedule
  }) => Promise<Result<unknown>>
  readonly eventUpdate: (args: {
    readonly token: string
    readonly orgId: string
    readonly eventKey: string
    readonly title?: string
    readonly subtitle?: string
    readonly description?: string
    readonly category?: string
    readonly startsAt?: string
    readonly endsAt?: string
    readonly doorsAt?: string
    readonly bookingOpensAt?: string
    readonly venue?: string
    readonly city?: string
    readonly address?: string
    readonly organizer?: string
    readonly imageUrl?: string
    readonly imageAlt?: string
    readonly tags?: string[]
    readonly faqs?: CatalogEventFaqs
    readonly schedule?: CatalogEventSchedule
  }) => Promise<Result<unknown>>
  readonly eventPublish: (args: {
    readonly token: string
    readonly orgId: string
    readonly eventKey: string
  }) => Promise<Result<unknown>>
  readonly eventArchive: (args: {
    readonly token: string
    readonly orgId: string
    readonly eventKey: string
  }) => Promise<Result<unknown>>
  readonly tierUpsert: (args: {
    readonly token: string
    readonly orgId: string
    readonly eventKey: string
    readonly tierKey?: string
    readonly name: string
    readonly description: string
    readonly startsAt?: string
    readonly doorsAt?: string
    readonly endsAt?: string
    readonly priceCents: number
    readonly capacity: number
    readonly maxPerOrder?: number
    readonly activationCodeRequired?: boolean
    readonly sortOrder?: number
  }) => Promise<Result<unknown>>
  readonly tierArchive: (args: {
    readonly token: string
    readonly orgId: string
    readonly eventKey: string
    readonly tierKey: string
  }) => Promise<Result<unknown>>
  readonly adminList: (args: {
    readonly token: string
    readonly status?: string
    readonly paginationOpts: OrganizerDashboardPaginationOpts
  }) => Promise<Result<unknown>>
  readonly adminDetail: (args: { readonly token: string; readonly orgId: string }) => Promise<Result<unknown>>
  readonly adminConfigure: (args: {
    readonly token: string
    readonly orgId: string
    readonly tax: { readonly status: string; readonly defaultRateBps: number }
    readonly fee: { readonly percentBps: number; readonly fixedCents: number; readonly payer: string }
  }) => Promise<Result<unknown>>
  readonly adminApprove: (args: { readonly token: string; readonly orgId: string }) => Promise<Result<unknown>>
  readonly adminBlock: (args: {
    readonly token: string
    readonly orgId: string
    readonly reason: string
  }) => Promise<Result<unknown>>
  readonly adminUnblock: (args: {
    readonly token: string
    readonly orgId: string
    readonly status: string
  }) => Promise<Result<unknown>>
  readonly migrationPlan: (args: {
    readonly token: string
    readonly paginationOpts: OrganizerDashboardPaginationOpts
  }) => Promise<Result<unknown>>
  readonly migrationApply: (args: {
    readonly token: string
    readonly orgInits: readonly { readonly orgId: string; readonly kind: string }[]
    readonly eventAssignments: readonly { readonly eventKey: string; readonly orgId: string }[]
    readonly roleAssignments: readonly { readonly userId: string; readonly orgId: string; readonly role: string }[]
    readonly scannerLinkApprovals: readonly {
      readonly linkId: string
      readonly eventKey: string
      readonly orgId: string
    }[]
  }) => Promise<Result<unknown>>
  readonly migrationBackfill: (args: {
    readonly token: string
    readonly eventKey: string
    readonly cursor?: string | null
    readonly pageSize?: number
  }) => Promise<Result<unknown>>
  readonly overviewGet: (args: {
    readonly token: string
    readonly orgId: string
    readonly eventKey?: string
    readonly fromDay?: string
    readonly toDay?: string
    readonly range?: "7" | "30" | "365"
  }) => Promise<Result<unknown>>
  readonly eventStatsGet: (args: {
    readonly token: string
    readonly orgId: string
    readonly eventKey: string
  }) => Promise<Result<unknown>>
  readonly exportList: (args: {
    readonly token: string
    readonly orgId: string
    readonly eventKey: string
    readonly kind: "teilnehmer" | "bestellungen" | "checkins"
    readonly search?: string
    readonly paginationOpts: OrganizerDashboardPaginationOpts
  }) => Promise<Result<unknown>>
  readonly publicProfileGet: (args: { readonly orgSlug: string }) => Promise<Result<unknown>>
  readonly publicEventGet: (args: { readonly orgSlug: string; readonly eventKey: string }) => Promise<Result<unknown>>
}

/**
 * Production backend for the organizer dashboard HTTP/CLI layer: forwards the
 * caller-supplied Bearer credential to the Convex functions. Only this
 * server-side factory touches the Convex client; tests inject a mock backend
 * with the same shape instead.
 */
export function organizerDashboardConvexBackendCreate(client: ConvexHttpClient): OrganizerDashboardHttpBackend {
  return {
    orderList: (args) =>
      client.query(api.organizerDashboardOrders.organizerDashboardOrderListQuery, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        paginationOpts: {
          numItems: args.paginationOpts.numItems,
          cursor: args.paginationOpts.cursor,
          ...(args.paginationOpts.endCursor != null ? { endCursor: args.paginationOpts.endCursor } : {}),
        },
      }),
    orderGet: (args) =>
      client.query(api.organizerDashboardOrders.organizerDashboardOrderGetQuery, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        orderId: args.orderId as Id<"ticketOrders">,
      }),
    orderNoteCreate: (args) =>
      client.mutation(api.organizerDashboardOrders.organizerDashboardOrderNoteCreateMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        orderId: args.orderId as Id<"ticketOrders">,
      }),
    orderNoteDelete: (args) =>
      client.mutation(api.organizerDashboardOrders.organizerDashboardOrderNoteDeleteMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        orderId: args.orderId as Id<"ticketOrders">,
        noteId: args.noteId as Id<"organizerDashboardOrderNotes">,
      }),
    orderBuyerContactUpdate: (args) =>
      client.mutation(api.organizerDashboardOrders.organizerDashboardOrderBuyerContactUpdateMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        orderId: args.orderId as Id<"ticketOrders">,
      }),
    orderParticipantUpdate: (args) =>
      client.mutation(api.organizerDashboardOrders.organizerDashboardOrderParticipantUpdateMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        orderId: args.orderId as Id<"ticketOrders">,
        ticketId: args.ticketId as Id<"ticketIssued">,
      }),
    orderParticipantList: (args) =>
      client.query(api.organizerDashboardOrders.organizerDashboardOrderParticipantListQuery, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        paginationOpts: {
          numItems: args.paginationOpts.numItems,
          cursor: args.paginationOpts.cursor,
          ...(args.paginationOpts.endCursor != null ? { endCursor: args.paginationOpts.endCursor } : {}),
        },
      }),
    orderRefundRequest: (args) =>
      client.action(api.organizerDashboardBilling.organizerDashboardOrderRefundRequestAction, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        orderId: args.orderId as Id<"ticketOrders">,
      }),
    orderRefundStatus: (args) =>
      client.action(api.organizerDashboardBilling.organizerDashboardOrderRefundStatusAction, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        orderId: args.orderId as Id<"ticketOrders">,
      }),
    orderInvoiceStatus: (args) =>
      client.action(api.organizerDashboardBilling.organizerDashboardOrderInvoiceStatusAction, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        orderId: args.orderId as Id<"ticketOrders">,
      }),
    orderInvoicePdf: (args) =>
      client.action(api.organizerDashboardBilling.organizerDashboardOrderInvoicePdfAction, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        orderId: args.orderId as Id<"ticketOrders">,
      }),
    orderInvoiceResend: (args) =>
      client.action(api.organizerDashboardBilling.organizerDashboardOrderInvoiceResendAction, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        orderId: args.orderId as Id<"ticketOrders">,
      }),
    financeOverview: (args) =>
      client.query(api.organizerDashboardFinance.organizerDashboardFinanceOverviewQuery, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
      }),
    settlementGet: (args) =>
      client.query(api.organizerDashboardFinance.organizerDashboardSettlementGetQuery, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
      }),
    payoutList: (args) =>
      client.query(api.organizerDashboardFinance.organizerDashboardPayoutListQuery, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        paginationOpts: {
          numItems: args.paginationOpts.numItems,
          cursor: args.paginationOpts.cursor,
          ...(args.paginationOpts.endCursor != null ? { endCursor: args.paginationOpts.endCursor } : {}),
        },
      }),
    payoutRecord: (args) =>
      client.mutation(api.organizerDashboardFinance.organizerDashboardPayoutRecordMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
      }),
    payoutStatusUpdate: (args) =>
      client.mutation(api.organizerDashboardFinance.organizerDashboardPayoutStatusUpdateMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        payoutId: args.payoutId as Id<"organizerDashboardPayouts">,
      }),
    phaseList: (args) =>
      client.query(api.organizerDashboardPricing.organizerDashboardPhaseListQuery, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
      }),
    phaseUpsert: (args) =>
      client.mutation(api.organizerDashboardPricing.organizerDashboardPhaseUpsertMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
      }),
    phaseArchive: (args) =>
      client.mutation(api.organizerDashboardPricing.organizerDashboardPhaseArchiveMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        phaseId: args.phaseId as Id<"organizerDashboardPricePhases">,
      }),
    codeList: (args) =>
      client.query(api.organizerDashboardPricing.organizerDashboardCodeListQuery, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        paginationOpts: {
          numItems: args.paginationOpts.numItems,
          cursor: args.paginationOpts.cursor,
          ...(args.paginationOpts.endCursor != null ? { endCursor: args.paginationOpts.endCursor } : {}),
        },
      }),
    codeCreate: (args) =>
      client.mutation(api.organizerDashboardPricing.organizerDashboardCodeCreateMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
      }),
    codeUpdate: (args) =>
      client.mutation(api.organizerDashboardPricing.organizerDashboardCodeUpdateMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        codeId: args.codeId as Id<"organizerDashboardCodes">,
      }),
    codeDelete: (args) =>
      client.mutation(api.organizerDashboardPricing.organizerDashboardCodeDeleteMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        codeId: args.codeId as Id<"organizerDashboardCodes">,
      }),
    voucherList: (args) =>
      client.query(api.organizerDashboardPricing.organizerDashboardVoucherListQuery, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        paginationOpts: {
          numItems: args.paginationOpts.numItems,
          cursor: args.paginationOpts.cursor,
          ...(args.paginationOpts.endCursor != null ? { endCursor: args.paginationOpts.endCursor } : {}),
        },
      }),
    voucherIssue: (args) =>
      client.mutation(api.organizerDashboardPricing.organizerDashboardVoucherIssueMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
      }),
    voucherRedeem: (args) =>
      client.mutation(api.organizerDashboardPricing.organizerDashboardVoucherRedeemMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
      }),
    voucherDeactivate: (args) =>
      client.mutation(api.organizerDashboardPricing.organizerDashboardVoucherDeactivateMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        voucherId: args.voucherId as Id<"organizerDashboardVouchers">,
      }),
    teamMemberList: (args) =>
      client.query(organizerDashboardTeamReferences.organizerDashboardTeamMemberListQuery, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
      }),
    teamInvitationList: (args) =>
      client.query(organizerDashboardTeamReferences.organizerDashboardTeamInvitationListQuery, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
      }),
    teamInvite: (args) =>
      client.mutation(organizerDashboardTeamReferences.organizerDashboardTeamInviteMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
      }),
    teamRoleUpdate: (args) =>
      client.mutation(organizerDashboardTeamReferences.organizerDashboardTeamRoleUpdateMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        memberId: args.memberId as Id<"orgMembers">,
      }),
    teamMemberRemove: (args) =>
      client.mutation(organizerDashboardTeamReferences.organizerDashboardTeamMemberRemoveMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        memberId: args.memberId as Id<"orgMembers">,
      }),
    teamInvitationRevoke: (args) =>
      client.mutation(organizerDashboardTeamReferences.organizerDashboardTeamInvitationRevokeMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        invitationId: args.invitationId as Id<"organizerDashboardTeamInvitations">,
      }),
    teamInvitationResend: (args) =>
      client.mutation(organizerDashboardTeamReferences.organizerDashboardTeamInvitationResendMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        invitationId: args.invitationId as Id<"organizerDashboardTeamInvitations">,
      }),
    teamInvitationInbox: (args) =>
      client.query(organizerDashboardTeamReferences.organizerDashboardTeamInvitationInboxQuery, args),
    teamInvitationAccept: (args) =>
      client.mutation(organizerDashboardTeamReferences.organizerDashboardTeamInvitationAcceptMutation, {
        ...args,
        invitationId: args.invitationId as Id<"organizerDashboardTeamInvitations">,
      }),
    guestQuotaList: (args) =>
      client.query(organizerDashboardGuestReferences.organizerDashboardGuestQuotaListQuery, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
      }),
    guestQuotaUpsert: (args) => {
      const { quotaId, ...rest } = args
      return client.mutation(organizerDashboardGuestReferences.organizerDashboardGuestQuotaUpsertMutation, {
        ...rest,
        orgId: args.orgId as Id<"orgs">,
        ...(quotaId !== undefined ? { quotaId: quotaId as Id<"organizerDashboardGuestQuotas"> } : {}),
      })
    },
    guestQuotaDelete: (args) =>
      client.mutation(organizerDashboardGuestReferences.organizerDashboardGuestQuotaDeleteMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        quotaId: args.quotaId as Id<"organizerDashboardGuestQuotas">,
      }),
    guestList: (args) =>
      client.query(organizerDashboardGuestReferences.organizerDashboardGuestListQuery, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
      }),
    guestUpsert: (args) => {
      const { guestId, ...rest } = args
      return client.mutation(organizerDashboardGuestReferences.organizerDashboardGuestUpsertMutation, {
        ...rest,
        orgId: args.orgId as Id<"orgs">,
        ...(guestId !== undefined ? { guestId: guestId as Id<"organizerDashboardGuests"> } : {}),
      })
    },
    guestDelete: (args) =>
      client.mutation(organizerDashboardGuestReferences.organizerDashboardGuestDeleteMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        guestId: args.guestId as Id<"organizerDashboardGuests">,
      }),
    guestTicketSend: (args) =>
      client.mutation(organizerDashboardGuestReferences.organizerDashboardGuestTicketSendMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        guestId: args.guestId as Id<"organizerDashboardGuests">,
      }),
    guestCheckIn: (args) =>
      client.mutation(organizerDashboardGuestReferences.organizerDashboardGuestCheckInMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        guestId: args.guestId as Id<"organizerDashboardGuests">,
      }),
    guestCheckInUndo: (args) =>
      client.mutation(organizerDashboardGuestReferences.organizerDashboardGuestCheckInUndoMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        guestId: args.guestId as Id<"organizerDashboardGuests">,
      }),
    messageList: (args) =>
      client.query(organizerDashboardMessageReferences.organizerDashboardMessageListQuery, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
      }),
    messageGet: (args) =>
      client.query(organizerDashboardMessageReferences.organizerDashboardMessageGetQuery, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        messageId: args.messageId as Id<"organizerDashboardMessages">,
      }),
    messageCreate: (args) =>
      client.mutation(organizerDashboardMessageReferences.organizerDashboardMessageCreateMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
      }),
    messageUpdate: (args) =>
      client.mutation(organizerDashboardMessageReferences.organizerDashboardMessageUpdateMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        messageId: args.messageId as Id<"organizerDashboardMessages">,
      }),
    messageSchedule: (args) =>
      client.mutation(organizerDashboardMessageReferences.organizerDashboardMessageScheduleMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        messageId: args.messageId as Id<"organizerDashboardMessages">,
      }),
    messageSend: (args) =>
      client.mutation(organizerDashboardMessageReferences.organizerDashboardMessageSendMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        messageId: args.messageId as Id<"organizerDashboardMessages">,
      }),
    messageDelete: (args) =>
      client.mutation(organizerDashboardMessageReferences.organizerDashboardMessageDeleteMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        messageId: args.messageId as Id<"organizerDashboardMessages">,
      }),
    messageIcsGet: (args) =>
      client.query(organizerDashboardMessageReferences.organizerDashboardMessageIcsGetQuery, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
      }),
    messageReminderGet: (args) =>
      client.query(organizerDashboardMessageReferences.organizerDashboardMessageReminderGetQuery, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
      }),
    messageReminderUpdate: (args) =>
      client.mutation(organizerDashboardMessageReferences.organizerDashboardMessageReminderUpdateMutation, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
      }),
    contextQuery: (args) =>
      client.query(api.organizerDashboard.organizerDashboardContextQuery, {
        token: args.token,
        ...(args.orgId !== undefined ? { orgId: args.orgId as Id<"orgs"> } : {}),
      }),
    organizationCreate: (args) =>
      client.mutation(api.organizerDashboard.organizerDashboardOrganizationCreateMutation, {
        token: args.token,
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
      }),
    organizationUpdate: (args) =>
      client.mutation(api.organizerDashboard.organizerDashboardOrganizationUpdateMutation, {
        token: args.token,
        orgId: args.orgId as Id<"orgs">,
        ...(args.name !== undefined ? { name: args.name } : {}),
        ...(args.kind !== undefined ? { kind: args.kind } : {}),
        ...(args.contactEmail !== undefined ? { contactEmail: args.contactEmail } : {}),
        ...(args.contactPhone !== undefined ? { contactPhone: args.contactPhone } : {}),
        ...(args.imprint !== undefined ? { imprint: args.imprint } : {}),
        ...(args.iban !== undefined ? { iban: args.iban } : {}),
        ...(args.bankHolder !== undefined ? { bankHolder: args.bankHolder } : {}),
      }),
    organizationGet: (args) =>
      client.query(api.organizerDashboardProfile.organizerDashboardOrganizationGetQuery, {
        token: args.token,
        orgId: args.orgId as Id<"orgs">,
      }),
    contractsAccept: (args) =>
      client.mutation(api.organizerDashboard.organizerContractsAcceptMutation, {
        token: args.token,
        orgId: args.orgId as Id<"orgs">,
        termsAccepted: args.termsAccepted,
        dpaAccepted: args.dpaAccepted,
        termsRevision: args.termsRevision,
        dpaRevision: args.dpaRevision,
      }),
    eventList: (args) =>
      client.query(api.organizerDashboardEvents.organizerDashboardEventListQuery, {
        token: args.token,
        orgId: args.orgId as Id<"orgs">,
        ...(args.status !== undefined ? { status: args.status } : {}),
        ...(args.search !== undefined ? { search: args.search } : {}),
        ...(args.sort !== undefined ? { sort: args.sort } : {}),
        ...(args.fromStartsAt !== undefined ? { fromStartsAt: args.fromStartsAt } : {}),
        ...(args.toStartsAt !== undefined ? { toStartsAt: args.toStartsAt } : {}),
        paginationOpts: {
          numItems: args.paginationOpts.numItems,
          cursor: args.paginationOpts.cursor,
          ...(args.paginationOpts.endCursor !== undefined && args.paginationOpts.endCursor !== null
            ? { endCursor: args.paginationOpts.endCursor }
            : {}),
        },
      }),
    eventGet: (args) =>
      client.query(api.organizerDashboardEvents.organizerDashboardEventGetQuery, {
        token: args.token,
        orgId: args.orgId as Id<"orgs">,
        eventKey: args.eventKey,
      }),
    eventCreate: (args) =>
      client.mutation(api.organizerDashboardEvents.organizerDashboardEventCreateMutation, {
        token: args.token,
        orgId: args.orgId as Id<"orgs">,
        title: args.title,
        subtitle: args.subtitle,
        description: args.description,
        category: args.category,
        startsAt: args.startsAt,
        endsAt: args.endsAt,
        doorsAt: args.doorsAt,
        ...(args.bookingOpensAt !== undefined ? { bookingOpensAt: args.bookingOpensAt } : {}),
        venue: args.venue,
        city: args.city,
        address: args.address,
        organizer: args.organizer,
        imageUrl: args.imageUrl,
        imageAlt: args.imageAlt,
        ...(args.tags !== undefined ? { tags: args.tags } : {}),
        ...(args.faqs !== undefined ? { faqs: args.faqs } : {}),
        ...(args.schedule !== undefined ? { schedule: args.schedule } : {}),
      }),
    eventUpdate: (args) =>
      client.mutation(api.organizerDashboardEvents.organizerDashboardEventUpdateMutation, {
        token: args.token,
        orgId: args.orgId as Id<"orgs">,
        eventKey: args.eventKey,
        ...(args.title !== undefined ? { title: args.title } : {}),
        ...(args.subtitle !== undefined ? { subtitle: args.subtitle } : {}),
        ...(args.description !== undefined ? { description: args.description } : {}),
        ...(args.category !== undefined ? { category: args.category } : {}),
        ...(args.startsAt !== undefined ? { startsAt: args.startsAt } : {}),
        ...(args.endsAt !== undefined ? { endsAt: args.endsAt } : {}),
        ...(args.doorsAt !== undefined ? { doorsAt: args.doorsAt } : {}),
        ...(args.bookingOpensAt !== undefined ? { bookingOpensAt: args.bookingOpensAt } : {}),
        ...(args.venue !== undefined ? { venue: args.venue } : {}),
        ...(args.city !== undefined ? { city: args.city } : {}),
        ...(args.address !== undefined ? { address: args.address } : {}),
        ...(args.organizer !== undefined ? { organizer: args.organizer } : {}),
        ...(args.imageUrl !== undefined ? { imageUrl: args.imageUrl } : {}),
        ...(args.imageAlt !== undefined ? { imageAlt: args.imageAlt } : {}),
        ...(args.tags !== undefined ? { tags: args.tags } : {}),
        ...(args.faqs !== undefined ? { faqs: args.faqs } : {}),
        ...(args.schedule !== undefined ? { schedule: args.schedule } : {}),
      }),
    eventPublish: (args) =>
      client.mutation(api.organizerDashboardEvents.organizerDashboardEventPublishMutation, {
        token: args.token,
        orgId: args.orgId as Id<"orgs">,
        eventKey: args.eventKey,
      }),
    eventArchive: (args) =>
      client.mutation(api.organizerDashboardEvents.organizerDashboardEventArchiveMutation, {
        token: args.token,
        orgId: args.orgId as Id<"orgs">,
        eventKey: args.eventKey,
      }),
    tierUpsert: (args) =>
      client.mutation(api.organizerDashboardEvents.organizerDashboardTierUpsertMutation, {
        token: args.token,
        orgId: args.orgId as Id<"orgs">,
        eventKey: args.eventKey,
        ...(args.tierKey !== undefined ? { tierKey: args.tierKey } : {}),
        name: args.name,
        description: args.description,
        ...(args.startsAt !== undefined ? { startsAt: args.startsAt } : {}),
        ...(args.doorsAt !== undefined ? { doorsAt: args.doorsAt } : {}),
        ...(args.endsAt !== undefined ? { endsAt: args.endsAt } : {}),
        priceCents: args.priceCents,
        capacity: args.capacity,
        ...(args.maxPerOrder !== undefined ? { maxPerOrder: args.maxPerOrder } : {}),
        ...(args.activationCodeRequired !== undefined ? { activationCodeRequired: args.activationCodeRequired } : {}),
        ...(args.sortOrder !== undefined ? { sortOrder: args.sortOrder } : {}),
      }),
    tierArchive: (args) =>
      client.mutation(api.organizerDashboardEvents.organizerDashboardTierArchiveMutation, {
        token: args.token,
        orgId: args.orgId as Id<"orgs">,
        eventKey: args.eventKey,
        tierKey: args.tierKey,
      }),
    adminList: (args) =>
      client.query(api.organizerDashboardAdmin.organizerDashboardAdminListQuery, {
        token: args.token,
        ...(args.status !== undefined ? { status: args.status } : {}),
        paginationOpts: {
          numItems: args.paginationOpts.numItems,
          cursor: args.paginationOpts.cursor,
          ...(args.paginationOpts.endCursor !== undefined && args.paginationOpts.endCursor !== null
            ? { endCursor: args.paginationOpts.endCursor }
            : {}),
        },
      }),
    adminDetail: (args) =>
      client.query(api.organizerDashboardAdmin.organizerDashboardAdminDetailQuery, {
        token: args.token,
        orgId: args.orgId as Id<"orgs">,
      }),
    adminConfigure: (args) =>
      client.mutation(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation, {
        token: args.token,
        orgId: args.orgId as Id<"orgs">,
        tax: { status: args.tax.status, defaultRateBps: args.tax.defaultRateBps },
        fee: { percentBps: args.fee.percentBps, fixedCents: args.fee.fixedCents, payer: args.fee.payer },
      }),
    adminApprove: (args) =>
      client.mutation(api.organizerDashboardAdmin.organizerDashboardAdminApproveMutation, {
        token: args.token,
        orgId: args.orgId as Id<"orgs">,
      }),
    adminBlock: (args) =>
      client.mutation(api.organizerDashboardAdmin.organizerDashboardAdminBlockMutation, {
        token: args.token,
        orgId: args.orgId as Id<"orgs">,
        reason: args.reason,
      }),
    adminUnblock: (args) =>
      client.mutation(api.organizerDashboardAdmin.organizerDashboardAdminUnblockMutation, {
        token: args.token,
        orgId: args.orgId as Id<"orgs">,
        status: args.status,
      }),
    migrationPlan: (args) =>
      client.query(api.organizerDashboardMigration.organizerDashboardMigrationPlanQuery, {
        token: args.token,
        paginationOpts: {
          numItems: args.paginationOpts.numItems,
          cursor: args.paginationOpts.cursor,
          ...(args.paginationOpts.endCursor !== undefined && args.paginationOpts.endCursor !== null
            ? { endCursor: args.paginationOpts.endCursor }
            : {}),
        },
      }),
    migrationApply: (args) =>
      client.mutation(api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation, {
        token: args.token,
        orgInits: args.orgInits.map((entry) => ({ orgId: entry.orgId as Id<"orgs">, kind: entry.kind })),
        eventAssignments: args.eventAssignments.map((entry) => ({
          eventKey: entry.eventKey,
          orgId: entry.orgId as Id<"orgs">,
        })),
        roleAssignments: args.roleAssignments.map((entry) => ({
          userId: entry.userId as Id<"users">,
          orgId: entry.orgId as Id<"orgs">,
          role: entry.role,
        })),
        scannerLinkApprovals: args.scannerLinkApprovals.map((entry) => ({
          linkId: entry.linkId as Id<"scannerLinks">,
          eventKey: entry.eventKey,
          orgId: entry.orgId as Id<"orgs">,
        })),
      }),
    migrationBackfill: (args) =>
      client.mutation(api.organizerDashboardMigration.organizerDashboardMigrationBackfillMutation, {
        token: args.token,
        eventKey: args.eventKey,
        ...(args.cursor !== undefined && args.cursor !== null ? { cursor: args.cursor } : {}),
        ...(args.pageSize !== undefined ? { pageSize: args.pageSize } : {}),
      }),
    overviewGet: (args) =>
      client.query(api.organizerDashboardOverview.organizerDashboardOverviewQuery, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
      }),
    eventStatsGet: (args) =>
      client.query(api.organizerDashboardOverview.organizerDashboardEventStatsQuery, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
      }),
    exportList: (args) =>
      client.query(api.organizerDashboardExports.organizerDashboardExportListQuery, {
        ...args,
        orgId: args.orgId as Id<"orgs">,
        paginationOpts: {
          numItems: args.paginationOpts.numItems,
          cursor: args.paginationOpts.cursor,
          ...(args.paginationOpts.endCursor != null ? { endCursor: args.paginationOpts.endCursor } : {}),
        },
      }),
    publicProfileGet: (args) =>
      client.query(api.organizerDashboardPublic.organizerDashboardPublicProfileQuery, { ...args }),
    publicEventGet: (args) =>
      client.query(api.organizerDashboardPublic.organizerDashboardPublicEventQuery, { ...args }),
  }
}
