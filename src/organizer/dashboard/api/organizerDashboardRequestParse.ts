import * as v from "valibot"
import { createResult, createResultError, type Result } from "#result"
import { organizerDashboardAdminConfigureSchema } from "../admin/organizerDashboardAdminConfigureSchema.ts"
import { organizerContractConsentSchema } from "../contracts/organizerContractConsentSchema.ts"
import { organizerDashboardEventCreateSchema } from "../events/model/organizerDashboardEventCreateSchema.ts"
import { organizerDashboardEventListFilterSchema } from "../events/model/organizerDashboardEventListFilterSchema.ts"
import { organizerDashboardEventPatchSchema } from "../events/model/organizerDashboardEventPatchSchema.ts"
import { organizerDashboardTierArchiveSchema } from "../events/model/organizerDashboardTierArchiveSchema.ts"
import { organizerDashboardTierUpsertSchema } from "../events/model/organizerDashboardTierUpsertSchema.ts"
import { organizerDashboardMigrationManifestSchema } from "../migration/organizerDashboardMigrationManifestSchema.ts"
import { organizerDashboardOrganizationBankSchema } from "../model/organizerDashboardOrganizationBankSchema.ts"
import { organizerDashboardOrganizationContactSchema } from "../model/organizerDashboardOrganizationContactSchema.ts"
import { organizerDashboardOrganizationCreateSchema } from "../model/organizerDashboardOrganizationCreateSchema.ts"
import { organizerDashboardOrganizationKindSchema } from "../model/organizerDashboardOrganizationKindSchema.ts"
import { organizerDashboardOrganizationStatusSchema } from "../model/organizerDashboardOrganizationStatusSchema.ts"
import { organizerDashboardOrganizationUpdateSchema } from "../model/organizerDashboardOrganizationUpdateSchema.ts"
import { organizerDashboardTeamInvitationActionSchema } from "../team/organizerDashboardTeamInvitationActionSchema.ts"
import { organizerDashboardTeamInviteSchema } from "../team/organizerDashboardTeamInviteSchema.ts"
import { organizerDashboardTeamMemberRemoveSchema } from "../team/organizerDashboardTeamMemberRemoveSchema.ts"
import { organizerDashboardTeamRoleUpdateSchema } from "../team/organizerDashboardTeamRoleUpdateSchema.ts"
import { type OrganizerDashboardOperation, organizerDashboardOperationSet } from "./organizerDashboardOperations.ts"
import { organizerDashboardExportInputSchemas } from "./organizerDashboardExportInputSchemas.ts"
import { organizerDashboardBillingInputSchemas } from "./organizerDashboardBillingInputSchemas.ts"
import { organizerDashboardFinanceInputSchemas } from "./organizerDashboardFinanceInputSchemas.ts"
import { organizerDashboardGuestInputSchemas } from "./organizerDashboardGuestInputSchemas.ts"
import { organizerDashboardMessageInputSchemas } from "./organizerDashboardMessageInputSchemas.ts"
import { organizerDashboardOverviewInputSchemas } from "./organizerDashboardOverviewInputSchemas.ts"
import { organizerDashboardPublicInputSchemas } from "./organizerDashboardPublicInputSchemas.ts"
import { organizerDashboardPricingInputSchemas } from "./organizerDashboardPricingInputSchemas.ts"
import { organizerDashboardOrderInputSchemas } from "./organizerDashboardOrderInputSchemas.ts"

const organizerDashboardGuestMessageOperationSet: ReadonlySet<string> = new Set([
  "guest-quota-list",
  "guest-quota-upsert",
  "guest-quota-delete",
  "guest-list",
  "guest-upsert",
  "guest-delete",
  "guest-ticket-send",
  "guest-check-in",
  "guest-check-in-undo",
  "message-list",
  "message-get",
  "message-create",
  "message-update",
  "message-schedule",
  "message-send",
  "message-delete",
  "message-ics-get",
  "message-reminder-get",
  "message-reminder-update",
])

const organizerDashboardRequestOrgIdSchema = v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty"))

const organizerDashboardRequestEventKeySchema = v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty"))

const organizerDashboardRequestReasonSchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1, "Cannot be empty"),
  v.maxLength(2000, "Too long"),
)

const organizerDashboardRequestNumItemsSchema = v.optional(
  v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(50)),
  25,
)

const organizerDashboardRequestCursorSchema = v.optional(v.nullable(v.string()))

const organizerDashboardContextRequestSchema = v.strictObject({
  operation: v.literal("context"),
  orgId: v.optional(organizerDashboardRequestOrgIdSchema),
})

const organizerDashboardCreateRequestSchema = v.strictObject({
  operation: v.literal("create"),
  name: organizerDashboardOrganizationCreateSchema.entries.name,
  slug: organizerDashboardOrganizationCreateSchema.entries.slug,
  kind: organizerDashboardOrganizationKindSchema,
  contactEmail: organizerDashboardOrganizationContactSchema.entries.email,
  contactPhone: organizerDashboardOrganizationContactSchema.entries.phone,
  imprint: organizerDashboardOrganizationCreateSchema.entries.imprint,
  iban: v.optional(organizerDashboardOrganizationBankSchema.entries.iban),
  bankHolder: v.optional(organizerDashboardOrganizationBankSchema.entries.holder),
  termsRevision: organizerDashboardOrganizationCreateSchema.entries.termsRevision,
  dpaRevision: organizerDashboardOrganizationCreateSchema.entries.dpaRevision,
  termsAccepted: organizerDashboardOrganizationCreateSchema.entries.termsAccepted,
  dpaAccepted: organizerDashboardOrganizationCreateSchema.entries.dpaAccepted,
})

const organizerDashboardUpdateRequestSchema = v.strictObject({
  operation: v.literal("update"),
  orgId: organizerDashboardRequestOrgIdSchema,
  name: v.optional(organizerDashboardOrganizationCreateSchema.entries.name),
  kind: v.optional(organizerDashboardOrganizationKindSchema),
  contactEmail: organizerDashboardOrganizationContactSchema.entries.email,
  contactPhone: organizerDashboardOrganizationContactSchema.entries.phone,
  imprint: v.optional(organizerDashboardOrganizationCreateSchema.entries.imprint),
  iban: v.optional(organizerDashboardOrganizationBankSchema.entries.iban),
  bankHolder: v.optional(organizerDashboardOrganizationBankSchema.entries.holder),
})

const organizerDashboardOrganizationGetRequestSchema = v.strictObject({
  operation: v.literal("organization-get"),
  orgId: organizerDashboardRequestOrgIdSchema,
})

/**
 * Acceptance of the current contract revisions for an existing organization.
 * The consent entries are taken from the shared consent schema, so HTTP, CLI
 * and TS client enforce the same literal true flags and the same exact
 * current revisions as the backend. Nothing is defaulted here: a missing or
 * stale revision is a 400 and never reaches the backend.
 */
const organizerDashboardContractsAcceptRequestSchema = v.strictObject({
  operation: v.literal("contracts-accept"),
  orgId: organizerDashboardRequestOrgIdSchema,
  termsAccepted: organizerContractConsentSchema.entries.termsAccepted,
  dpaAccepted: organizerContractConsentSchema.entries.dpaAccepted,
  termsRevision: organizerContractConsentSchema.entries.termsRevision,
  dpaRevision: organizerContractConsentSchema.entries.dpaRevision,
})

const organizerDashboardTeamPageEntries = {
  numItems: organizerDashboardRequestNumItemsSchema,
  cursor: organizerDashboardRequestCursorSchema,
  endCursor: organizerDashboardRequestCursorSchema,
}

const organizerDashboardTeamMemberListRequestSchema = v.strictObject({
  operation: v.literal("team-member-list"),
  orgId: organizerDashboardRequestOrgIdSchema,
  ...organizerDashboardTeamPageEntries,
})
const organizerDashboardTeamInvitationListRequestSchema = v.strictObject({
  operation: v.literal("team-invitation-list"),
  orgId: organizerDashboardRequestOrgIdSchema,
  ...organizerDashboardTeamPageEntries,
})
const organizerDashboardTeamInviteRequestSchema = v.strictObject({
  operation: v.literal("team-invite"),
  orgId: organizerDashboardRequestOrgIdSchema,
  ...organizerDashboardTeamInviteSchema.entries,
})
const organizerDashboardTeamRoleUpdateRequestSchema = v.strictObject({
  operation: v.literal("team-role-update"),
  orgId: organizerDashboardRequestOrgIdSchema,
  ...organizerDashboardTeamRoleUpdateSchema.entries,
})
const organizerDashboardTeamMemberRemoveRequestSchema = v.strictObject({
  operation: v.literal("team-member-remove"),
  orgId: organizerDashboardRequestOrgIdSchema,
  ...organizerDashboardTeamMemberRemoveSchema.entries,
})
const organizerDashboardTeamInvitationRevokeRequestSchema = v.strictObject({
  operation: v.literal("team-invitation-revoke"),
  orgId: organizerDashboardRequestOrgIdSchema,
  ...organizerDashboardTeamInvitationActionSchema.entries,
})
const organizerDashboardTeamInvitationResendRequestSchema = v.strictObject({
  operation: v.literal("team-invitation-resend"),
  orgId: organizerDashboardRequestOrgIdSchema,
  ...organizerDashboardTeamInvitationActionSchema.entries,
})
const organizerDashboardTeamInvitationInboxRequestSchema = v.strictObject({
  operation: v.literal("team-invitation-inbox"),
  ...organizerDashboardTeamPageEntries,
})
const organizerDashboardTeamInvitationAcceptRequestSchema = v.strictObject({
  operation: v.literal("team-invitation-accept"),
  ...organizerDashboardTeamInvitationActionSchema.entries,
})

const organizerDashboardEventListRequestSchema = v.strictObject({
  operation: v.literal("event-list"),
  orgId: organizerDashboardRequestOrgIdSchema,
  status: v.optional(organizerDashboardEventListFilterSchema.entries.status),
  search: v.optional(organizerDashboardEventListFilterSchema.entries.search),
  sort: v.optional(organizerDashboardEventListFilterSchema.entries.sort),
  fromStartsAt: v.optional(organizerDashboardEventListFilterSchema.entries.fromStartsAt),
  toStartsAt: v.optional(organizerDashboardEventListFilterSchema.entries.toStartsAt),
  numItems: organizerDashboardRequestNumItemsSchema,
  cursor: organizerDashboardRequestCursorSchema,
  endCursor: organizerDashboardRequestCursorSchema,
})

const organizerDashboardEventGetRequestSchema = v.strictObject({
  operation: v.literal("event-get"),
  orgId: organizerDashboardRequestOrgIdSchema,
  eventKey: organizerDashboardRequestEventKeySchema,
})

const organizerDashboardEventCreateRequestSchema = v.strictObject({
  operation: v.literal("event-create"),
  orgId: organizerDashboardRequestOrgIdSchema,
  title: organizerDashboardEventCreateSchema.entries.title,
  subtitle: organizerDashboardEventCreateSchema.entries.subtitle,
  description: organizerDashboardEventCreateSchema.entries.description,
  category: organizerDashboardEventCreateSchema.entries.category,
  startsAt: organizerDashboardEventCreateSchema.entries.startsAt,
  endsAt: organizerDashboardEventCreateSchema.entries.endsAt,
  doorsAt: organizerDashboardEventCreateSchema.entries.doorsAt,
  bookingOpensAt: organizerDashboardEventCreateSchema.entries.bookingOpensAt,
  venue: organizerDashboardEventCreateSchema.entries.venue,
  city: organizerDashboardEventCreateSchema.entries.city,
  address: organizerDashboardEventCreateSchema.entries.address,
  organizer: organizerDashboardEventCreateSchema.entries.organizer,
  imageUrl: organizerDashboardEventCreateSchema.entries.imageUrl,
  imageAlt: organizerDashboardEventCreateSchema.entries.imageAlt,
  tags: organizerDashboardEventCreateSchema.entries.tags,
  faqs: organizerDashboardEventCreateSchema.entries.faqs,
  schedule: organizerDashboardEventCreateSchema.entries.schedule,
})

const organizerDashboardEventUpdateRequestSchema = v.strictObject({
  operation: v.literal("event-update"),
  orgId: organizerDashboardRequestOrgIdSchema,
  eventKey: organizerDashboardRequestEventKeySchema,
  title: organizerDashboardEventPatchSchema.entries.title,
  subtitle: organizerDashboardEventPatchSchema.entries.subtitle,
  description: organizerDashboardEventPatchSchema.entries.description,
  category: organizerDashboardEventPatchSchema.entries.category,
  startsAt: organizerDashboardEventPatchSchema.entries.startsAt,
  endsAt: organizerDashboardEventPatchSchema.entries.endsAt,
  doorsAt: organizerDashboardEventPatchSchema.entries.doorsAt,
  bookingOpensAt: organizerDashboardEventPatchSchema.entries.bookingOpensAt,
  venue: organizerDashboardEventPatchSchema.entries.venue,
  city: organizerDashboardEventPatchSchema.entries.city,
  address: organizerDashboardEventPatchSchema.entries.address,
  organizer: organizerDashboardEventPatchSchema.entries.organizer,
  imageUrl: organizerDashboardEventPatchSchema.entries.imageUrl,
  imageAlt: organizerDashboardEventPatchSchema.entries.imageAlt,
  tags: organizerDashboardEventPatchSchema.entries.tags,
  faqs: organizerDashboardEventPatchSchema.entries.faqs,
  schedule: organizerDashboardEventPatchSchema.entries.schedule,
})

const organizerDashboardEventPublishRequestSchema = v.strictObject({
  operation: v.literal("event-publish"),
  orgId: organizerDashboardRequestOrgIdSchema,
  eventKey: organizerDashboardRequestEventKeySchema,
})

const organizerDashboardEventArchiveRequestSchema = v.strictObject({
  operation: v.literal("event-archive"),
  orgId: organizerDashboardRequestOrgIdSchema,
  eventKey: organizerDashboardRequestEventKeySchema,
})

const organizerDashboardTierUpsertRequestSchema = v.strictObject({
  operation: v.literal("tier-upsert"),
  orgId: organizerDashboardRequestOrgIdSchema,
  eventKey: organizerDashboardRequestEventKeySchema,
  tierKey: organizerDashboardTierUpsertSchema.entries.tierKey,
  name: organizerDashboardTierUpsertSchema.entries.name,
  description: organizerDashboardTierUpsertSchema.entries.description,
  startsAt: organizerDashboardTierUpsertSchema.entries.startsAt,
  doorsAt: organizerDashboardTierUpsertSchema.entries.doorsAt,
  endsAt: organizerDashboardTierUpsertSchema.entries.endsAt,
  priceCents: organizerDashboardTierUpsertSchema.entries.priceCents,
  capacity: organizerDashboardTierUpsertSchema.entries.capacity,
  maxPerOrder: organizerDashboardTierUpsertSchema.entries.maxPerOrder,
  activationCodeRequired: organizerDashboardTierUpsertSchema.entries.activationCodeRequired,
  sortOrder: organizerDashboardTierUpsertSchema.entries.sortOrder,
})

const organizerDashboardTierArchiveRequestSchema = v.strictObject({
  operation: v.literal("tier-archive"),
  orgId: organizerDashboardRequestOrgIdSchema,
  eventKey: organizerDashboardRequestEventKeySchema,
  tierKey: organizerDashboardTierArchiveSchema.entries.tierKey,
})

const organizerDashboardAdminListRequestSchema = v.strictObject({
  operation: v.literal("admin-list"),
  status: v.optional(organizerDashboardOrganizationStatusSchema),
  numItems: organizerDashboardRequestNumItemsSchema,
  cursor: organizerDashboardRequestCursorSchema,
  endCursor: organizerDashboardRequestCursorSchema,
})

const organizerDashboardAdminDetailRequestSchema = v.strictObject({
  operation: v.literal("admin-detail"),
  orgId: organizerDashboardRequestOrgIdSchema,
})

const organizerDashboardAdminConfigureRequestSchema = v.strictObject({
  operation: v.literal("admin-configure"),
  orgId: organizerDashboardAdminConfigureSchema.entries.orgId,
  tax: organizerDashboardAdminConfigureSchema.entries.tax,
  fee: organizerDashboardAdminConfigureSchema.entries.fee,
})

const organizerDashboardAdminApproveRequestSchema = v.strictObject({
  operation: v.literal("admin-approve"),
  orgId: organizerDashboardRequestOrgIdSchema,
})

const organizerDashboardAdminBlockRequestSchema = v.strictObject({
  operation: v.literal("admin-block"),
  orgId: organizerDashboardRequestOrgIdSchema,
  reason: organizerDashboardRequestReasonSchema,
})

const organizerDashboardAdminUnblockRequestSchema = v.strictObject({
  operation: v.literal("admin-unblock"),
  orgId: organizerDashboardRequestOrgIdSchema,
  status: organizerDashboardOrganizationStatusSchema,
})

const organizerDashboardMigrationPlanRequestSchema = v.strictObject({
  operation: v.literal("migration-plan"),
  numItems: organizerDashboardRequestNumItemsSchema,
  cursor: organizerDashboardRequestCursorSchema,
  endCursor: organizerDashboardRequestCursorSchema,
})

const organizerDashboardMigrationApplyRequestSchema = v.strictObject({
  operation: v.literal("migration-apply"),
  orgInits: organizerDashboardMigrationManifestSchema.entries.orgInits,
  eventAssignments: organizerDashboardMigrationManifestSchema.entries.eventAssignments,
  roleAssignments: organizerDashboardMigrationManifestSchema.entries.roleAssignments,
  scannerLinkApprovals: organizerDashboardMigrationManifestSchema.entries.scannerLinkApprovals,
})

const organizerDashboardMigrationBackfillRequestSchema = v.strictObject({
  operation: v.literal("migration-backfill"),
  eventKey: organizerDashboardRequestEventKeySchema,
  cursor: organizerDashboardRequestCursorSchema,
  pageSize: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100))),
})

const organizerDashboardOrderListRequestSchema = v.strictObject({
  operation: v.literal("order-list"),
  ...organizerDashboardOrderInputSchemas.orderList.entries,
})
const organizerDashboardOrderGetRequestSchema = v.strictObject({
  operation: v.literal("order-get"),
  ...organizerDashboardOrderInputSchemas.orderGet.entries,
})
const organizerDashboardOrderNoteCreateRequestSchema = v.strictObject({
  operation: v.literal("order-note-create"),
  ...organizerDashboardOrderInputSchemas.orderNoteCreate.entries,
})
const organizerDashboardOrderNoteDeleteRequestSchema = v.strictObject({
  operation: v.literal("order-note-delete"),
  ...organizerDashboardOrderInputSchemas.orderNoteDelete.entries,
})
const organizerDashboardOrderBuyerContactUpdateRequestSchema = v.strictObject({
  operation: v.literal("order-buyer-contact-update"),
  ...organizerDashboardOrderInputSchemas.orderBuyerContactUpdate.entries,
})
const organizerDashboardOrderParticipantUpdateRequestSchema = v.strictObject({
  operation: v.literal("order-participant-update"),
  ...organizerDashboardOrderInputSchemas.orderParticipantUpdate.entries,
})
const organizerDashboardOrderParticipantListRequestSchema = v.strictObject({
  operation: v.literal("order-participant-list"),
  ...organizerDashboardOrderInputSchemas.orderParticipantList.entries,
})

const organizerDashboardBillingRefundRequestSchema = v.strictObject({
  operation: v.literal("order-refund-request"),
  ...organizerDashboardBillingInputSchemas.billingRefundRequest.entries,
})
const organizerDashboardBillingRefundStatusSchema = v.strictObject({
  operation: v.literal("order-refund-status"),
  ...organizerDashboardBillingInputSchemas.billingRefundStatus.entries,
})
const organizerDashboardBillingInvoiceStatusSchema = v.strictObject({
  operation: v.literal("order-invoice-status"),
  ...organizerDashboardBillingInputSchemas.billingInvoiceStatus.entries,
})
const organizerDashboardBillingInvoicePdfSchema = v.strictObject({
  operation: v.literal("order-invoice-pdf"),
  ...organizerDashboardBillingInputSchemas.billingInvoicePdf.entries,
})
const organizerDashboardBillingInvoiceResendSchema = v.strictObject({
  operation: v.literal("order-invoice-resend"),
  ...organizerDashboardBillingInputSchemas.billingInvoiceResend.entries,
})

const organizerDashboardFinanceOverviewRequestSchema = v.strictObject({
  operation: v.literal("finance-overview"),
  ...organizerDashboardFinanceInputSchemas.financeOverview.entries,
})
const organizerDashboardSettlementGetRequestSchema = v.strictObject({
  operation: v.literal("settlement-get"),
  ...organizerDashboardFinanceInputSchemas.settlementGet.entries,
})
const organizerDashboardPayoutListRequestSchema = v.strictObject({
  operation: v.literal("payout-list"),
  ...organizerDashboardFinanceInputSchemas.payoutList.entries,
})
const organizerDashboardPayoutRecordRequestSchema = v.strictObject({
  operation: v.literal("payout-record"),
  ...organizerDashboardFinanceInputSchemas.payoutRecord.entries,
})
const organizerDashboardPayoutStatusUpdateRequestSchema = v.strictObject({
  operation: v.literal("payout-status-update"),
  ...organizerDashboardPricingInputSchemas.payoutStatusUpdate.entries,
})
const organizerDashboardPhaseListRequestSchema = v.strictObject({
  operation: v.literal("phase-list"),
  ...organizerDashboardPricingInputSchemas.phaseList.entries,
})
const organizerDashboardPhaseUpsertRequestSchema = v.strictObject({
  operation: v.literal("phase-upsert"),
  ...organizerDashboardPricingInputSchemas.phaseUpsert.entries,
})
const organizerDashboardPhaseArchiveRequestSchema = v.strictObject({
  operation: v.literal("phase-archive"),
  ...organizerDashboardPricingInputSchemas.phaseArchive.entries,
})
const organizerDashboardCodeListRequestSchema = v.strictObject({
  operation: v.literal("code-list"),
  ...organizerDashboardPricingInputSchemas.codeList.entries,
})
const organizerDashboardCodeCreateRequestSchema = v.strictObject({
  operation: v.literal("code-create"),
  ...organizerDashboardPricingInputSchemas.codeCreate.entries,
})
const organizerDashboardCodeUpdateRequestSchema = v.strictObject({
  operation: v.literal("code-update"),
  ...organizerDashboardPricingInputSchemas.codeUpdate.entries,
})
const organizerDashboardCodeDeleteRequestSchema = v.strictObject({
  operation: v.literal("code-delete"),
  ...organizerDashboardPricingInputSchemas.codeDelete.entries,
})
const organizerDashboardVoucherListRequestSchema = v.strictObject({
  operation: v.literal("voucher-list"),
  ...organizerDashboardPricingInputSchemas.voucherList.entries,
})
const organizerDashboardVoucherIssueRequestSchema = v.strictObject({
  operation: v.literal("voucher-issue"),
  ...organizerDashboardPricingInputSchemas.voucherIssue.entries,
})
const organizerDashboardVoucherRedeemRequestSchema = v.strictObject({
  operation: v.literal("voucher-redeem"),
  ...organizerDashboardPricingInputSchemas.voucherRedeem.entries,
})
const organizerDashboardVoucherDeactivateRequestSchema = v.strictObject({
  operation: v.literal("voucher-deactivate"),
  ...organizerDashboardPricingInputSchemas.voucherDeactivate.entries,
})

const organizerDashboardGuestQuotaListRequestSchema = v.strictObject({
  operation: v.literal("guest-quota-list"),
  ...organizerDashboardGuestInputSchemas.quotaList.entries,
})
const organizerDashboardGuestQuotaUpsertRequestSchema = v.strictObject({
  operation: v.literal("guest-quota-upsert"),
  ...organizerDashboardGuestInputSchemas.quotaUpsert.entries,
})
const organizerDashboardGuestQuotaDeleteRequestSchema = v.strictObject({
  operation: v.literal("guest-quota-delete"),
  ...organizerDashboardGuestInputSchemas.quotaDelete.entries,
})
const organizerDashboardGuestListRequestSchema = v.strictObject({
  operation: v.literal("guest-list"),
  ...organizerDashboardGuestInputSchemas.guestList.entries,
})
const organizerDashboardGuestUpsertRequestSchema = v.strictObject({
  operation: v.literal("guest-upsert"),
  ...organizerDashboardGuestInputSchemas.guestUpsert.entries,
})
const organizerDashboardGuestDeleteRequestSchema = v.strictObject({
  operation: v.literal("guest-delete"),
  ...organizerDashboardGuestInputSchemas.guestDelete.entries,
})
const organizerDashboardGuestTicketSendRequestSchema = v.strictObject({
  operation: v.literal("guest-ticket-send"),
  ...organizerDashboardGuestInputSchemas.guestTicketSend.entries,
})
const organizerDashboardGuestCheckInRequestSchema = v.strictObject({
  operation: v.literal("guest-check-in"),
  ...organizerDashboardGuestInputSchemas.guestCheckIn.entries,
})
const organizerDashboardGuestCheckInUndoRequestSchema = v.strictObject({
  operation: v.literal("guest-check-in-undo"),
  ...organizerDashboardGuestInputSchemas.guestCheckInUndo.entries,
})
const organizerDashboardMessageListRequestSchema = v.strictObject({
  operation: v.literal("message-list"),
  ...organizerDashboardMessageInputSchemas.messageList.entries,
})
const organizerDashboardMessageGetRequestSchema = v.strictObject({
  operation: v.literal("message-get"),
  ...organizerDashboardMessageInputSchemas.messageGet.entries,
})
const organizerDashboardMessageCreateRequestSchema = v.strictObject({
  operation: v.literal("message-create"),
  ...organizerDashboardMessageInputSchemas.messageCreate.entries,
})
const organizerDashboardMessageUpdateRequestSchema = v.strictObject({
  operation: v.literal("message-update"),
  ...organizerDashboardMessageInputSchemas.messageUpdate.entries,
})
const organizerDashboardMessageScheduleRequestSchema = v.strictObject({
  operation: v.literal("message-schedule"),
  ...organizerDashboardMessageInputSchemas.messageSchedule.entries,
})
const organizerDashboardMessageSendRequestSchema = v.strictObject({
  operation: v.literal("message-send"),
  ...organizerDashboardMessageInputSchemas.messageSend.entries,
})
const organizerDashboardMessageDeleteRequestSchema = v.strictObject({
  operation: v.literal("message-delete"),
  ...organizerDashboardMessageInputSchemas.messageDelete.entries,
})
const organizerDashboardMessageIcsGetRequestSchema = v.strictObject({
  operation: v.literal("message-ics-get"),
  ...organizerDashboardMessageInputSchemas.messageIcsGet.entries,
})
const organizerDashboardMessageReminderGetRequestSchema = v.strictObject({
  operation: v.literal("message-reminder-get"),
  ...organizerDashboardMessageInputSchemas.messageReminderGet.entries,
})
const organizerDashboardMessageReminderUpdateRequestSchema = v.strictObject({
  operation: v.literal("message-reminder-update"),
  ...organizerDashboardMessageInputSchemas.messageReminderUpdate.entries,
})
const organizerDashboardOverviewGetRequestSchema = v.strictObject({
  operation: v.literal("overview-get"),
  ...organizerDashboardOverviewInputSchemas.overviewGet.entries,
})
const organizerDashboardEventStatsGetRequestSchema = v.strictObject({
  operation: v.literal("event-stats-get"),
  ...organizerDashboardOverviewInputSchemas.eventStatsGet.entries,
})
const organizerDashboardExportListRequestSchema = v.strictObject({
  operation: v.literal("export-list"),
  ...organizerDashboardExportInputSchemas.exportList.entries,
})
const organizerDashboardPublicProfileGetRequestSchema = v.strictObject({
  operation: v.literal("public-profile-get"),
  ...organizerDashboardPublicInputSchemas.publicProfileGet.entries,
})
const organizerDashboardPublicEventGetRequestSchema = v.strictObject({
  operation: v.literal("public-event-get"),
  ...organizerDashboardPublicInputSchemas.publicEventGet.entries,
})

const organizerDashboardRequestSchema = v.variant("operation", [
  organizerDashboardBillingRefundRequestSchema,
  organizerDashboardBillingRefundStatusSchema,
  organizerDashboardBillingInvoiceStatusSchema,
  organizerDashboardBillingInvoicePdfSchema,
  organizerDashboardBillingInvoiceResendSchema,
  organizerDashboardOrderListRequestSchema,
  organizerDashboardOrderGetRequestSchema,
  organizerDashboardOrderNoteCreateRequestSchema,
  organizerDashboardOrderNoteDeleteRequestSchema,
  organizerDashboardOrderBuyerContactUpdateRequestSchema,
  organizerDashboardOrderParticipantUpdateRequestSchema,
  organizerDashboardOrderParticipantListRequestSchema,
  organizerDashboardFinanceOverviewRequestSchema,
  organizerDashboardSettlementGetRequestSchema,
  organizerDashboardPayoutListRequestSchema,
  organizerDashboardPayoutRecordRequestSchema,
  organizerDashboardPayoutStatusUpdateRequestSchema,
  organizerDashboardPhaseListRequestSchema,
  organizerDashboardPhaseUpsertRequestSchema,
  organizerDashboardPhaseArchiveRequestSchema,
  organizerDashboardCodeListRequestSchema,
  organizerDashboardCodeCreateRequestSchema,
  organizerDashboardCodeUpdateRequestSchema,
  organizerDashboardCodeDeleteRequestSchema,
  organizerDashboardVoucherListRequestSchema,
  organizerDashboardVoucherIssueRequestSchema,
  organizerDashboardVoucherRedeemRequestSchema,
  organizerDashboardVoucherDeactivateRequestSchema,
  organizerDashboardContextRequestSchema,
  organizerDashboardCreateRequestSchema,
  organizerDashboardUpdateRequestSchema,
  organizerDashboardContractsAcceptRequestSchema,
  organizerDashboardOrganizationGetRequestSchema,
  organizerDashboardTeamMemberListRequestSchema,
  organizerDashboardTeamInvitationListRequestSchema,
  organizerDashboardTeamInviteRequestSchema,
  organizerDashboardTeamRoleUpdateRequestSchema,
  organizerDashboardTeamMemberRemoveRequestSchema,
  organizerDashboardTeamInvitationRevokeRequestSchema,
  organizerDashboardTeamInvitationResendRequestSchema,
  organizerDashboardTeamInvitationInboxRequestSchema,
  organizerDashboardTeamInvitationAcceptRequestSchema,
  organizerDashboardEventListRequestSchema,
  organizerDashboardEventGetRequestSchema,
  organizerDashboardEventCreateRequestSchema,
  organizerDashboardEventUpdateRequestSchema,
  organizerDashboardEventPublishRequestSchema,
  organizerDashboardEventArchiveRequestSchema,
  organizerDashboardTierUpsertRequestSchema,
  organizerDashboardTierArchiveRequestSchema,
  organizerDashboardAdminListRequestSchema,
  organizerDashboardAdminDetailRequestSchema,
  organizerDashboardAdminConfigureRequestSchema,
  organizerDashboardAdminApproveRequestSchema,
  organizerDashboardAdminBlockRequestSchema,
  organizerDashboardAdminUnblockRequestSchema,
  organizerDashboardMigrationPlanRequestSchema,
  organizerDashboardMigrationApplyRequestSchema,
  organizerDashboardMigrationBackfillRequestSchema,
  organizerDashboardGuestQuotaListRequestSchema,
  organizerDashboardGuestQuotaUpsertRequestSchema,
  organizerDashboardGuestQuotaDeleteRequestSchema,
  organizerDashboardGuestListRequestSchema,
  organizerDashboardGuestUpsertRequestSchema,
  organizerDashboardGuestDeleteRequestSchema,
  organizerDashboardGuestTicketSendRequestSchema,
  organizerDashboardGuestCheckInRequestSchema,
  organizerDashboardGuestCheckInUndoRequestSchema,
  organizerDashboardMessageListRequestSchema,
  organizerDashboardMessageGetRequestSchema,
  organizerDashboardMessageCreateRequestSchema,
  organizerDashboardMessageUpdateRequestSchema,
  organizerDashboardMessageScheduleRequestSchema,
  organizerDashboardMessageSendRequestSchema,
  organizerDashboardMessageDeleteRequestSchema,
  organizerDashboardMessageIcsGetRequestSchema,
  organizerDashboardMessageReminderGetRequestSchema,
  organizerDashboardMessageReminderUpdateRequestSchema,
  organizerDashboardOverviewGetRequestSchema,
  organizerDashboardEventStatsGetRequestSchema,
  organizerDashboardExportListRequestSchema,
  organizerDashboardPublicProfileGetRequestSchema,
  organizerDashboardPublicEventGetRequestSchema,
])

type OrganizerDashboardRequestOf<TOperation extends OrganizerDashboardOperation, TArgs> = {
  readonly operation: TOperation
  readonly args: TArgs
}

type OrganizerDashboardRequestArgs<TSchema extends v.GenericSchema> = Omit<v.InferOutput<TSchema>, "operation">

export type OrganizerDashboardRequest =
  | OrganizerDashboardRequestOf<
      "order-refund-request",
      OrganizerDashboardRequestArgs<typeof organizerDashboardBillingRefundRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "order-refund-status",
      OrganizerDashboardRequestArgs<typeof organizerDashboardBillingRefundStatusSchema>
    >
  | OrganizerDashboardRequestOf<
      "order-invoice-status",
      OrganizerDashboardRequestArgs<typeof organizerDashboardBillingInvoiceStatusSchema>
    >
  | OrganizerDashboardRequestOf<
      "order-invoice-pdf",
      OrganizerDashboardRequestArgs<typeof organizerDashboardBillingInvoicePdfSchema>
    >
  | OrganizerDashboardRequestOf<
      "order-invoice-resend",
      OrganizerDashboardRequestArgs<typeof organizerDashboardBillingInvoiceResendSchema>
    >
  | OrganizerDashboardRequestOf<
      "order-list",
      OrganizerDashboardRequestArgs<typeof organizerDashboardOrderListRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "order-get",
      OrganizerDashboardRequestArgs<typeof organizerDashboardOrderGetRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "order-note-create",
      OrganizerDashboardRequestArgs<typeof organizerDashboardOrderNoteCreateRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "order-note-delete",
      OrganizerDashboardRequestArgs<typeof organizerDashboardOrderNoteDeleteRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "order-buyer-contact-update",
      OrganizerDashboardRequestArgs<typeof organizerDashboardOrderBuyerContactUpdateRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "order-participant-update",
      OrganizerDashboardRequestArgs<typeof organizerDashboardOrderParticipantUpdateRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "order-participant-list",
      OrganizerDashboardRequestArgs<typeof organizerDashboardOrderParticipantListRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "finance-overview",
      OrganizerDashboardRequestArgs<typeof organizerDashboardFinanceOverviewRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "settlement-get",
      OrganizerDashboardRequestArgs<typeof organizerDashboardSettlementGetRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "payout-list",
      OrganizerDashboardRequestArgs<typeof organizerDashboardPayoutListRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "payout-record",
      OrganizerDashboardRequestArgs<typeof organizerDashboardPayoutRecordRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "payout-status-update",
      OrganizerDashboardRequestArgs<typeof organizerDashboardPayoutStatusUpdateRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "phase-list",
      OrganizerDashboardRequestArgs<typeof organizerDashboardPhaseListRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "phase-upsert",
      OrganizerDashboardRequestArgs<typeof organizerDashboardPhaseUpsertRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "phase-archive",
      OrganizerDashboardRequestArgs<typeof organizerDashboardPhaseArchiveRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "code-list",
      OrganizerDashboardRequestArgs<typeof organizerDashboardCodeListRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "code-create",
      OrganizerDashboardRequestArgs<typeof organizerDashboardCodeCreateRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "code-update",
      OrganizerDashboardRequestArgs<typeof organizerDashboardCodeUpdateRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "code-delete",
      OrganizerDashboardRequestArgs<typeof organizerDashboardCodeDeleteRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "voucher-list",
      OrganizerDashboardRequestArgs<typeof organizerDashboardVoucherListRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "voucher-issue",
      OrganizerDashboardRequestArgs<typeof organizerDashboardVoucherIssueRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "voucher-redeem",
      OrganizerDashboardRequestArgs<typeof organizerDashboardVoucherRedeemRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "voucher-deactivate",
      OrganizerDashboardRequestArgs<typeof organizerDashboardVoucherDeactivateRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "team-member-list",
      OrganizerDashboardRequestArgs<typeof organizerDashboardTeamMemberListRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "team-invitation-list",
      OrganizerDashboardRequestArgs<typeof organizerDashboardTeamInvitationListRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "team-invite",
      OrganizerDashboardRequestArgs<typeof organizerDashboardTeamInviteRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "team-role-update",
      OrganizerDashboardRequestArgs<typeof organizerDashboardTeamRoleUpdateRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "team-member-remove",
      OrganizerDashboardRequestArgs<typeof organizerDashboardTeamMemberRemoveRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "team-invitation-revoke",
      OrganizerDashboardRequestArgs<typeof organizerDashboardTeamInvitationRevokeRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "team-invitation-resend",
      OrganizerDashboardRequestArgs<typeof organizerDashboardTeamInvitationResendRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "team-invitation-inbox",
      OrganizerDashboardRequestArgs<typeof organizerDashboardTeamInvitationInboxRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "team-invitation-accept",
      OrganizerDashboardRequestArgs<typeof organizerDashboardTeamInvitationAcceptRequestSchema>
    >
  | OrganizerDashboardRequestOf<"context", OrganizerDashboardRequestArgs<typeof organizerDashboardContextRequestSchema>>
  | OrganizerDashboardRequestOf<"create", OrganizerDashboardRequestArgs<typeof organizerDashboardCreateRequestSchema>>
  | OrganizerDashboardRequestOf<"update", OrganizerDashboardRequestArgs<typeof organizerDashboardUpdateRequestSchema>>
  | OrganizerDashboardRequestOf<
      "contracts-accept",
      OrganizerDashboardRequestArgs<typeof organizerDashboardContractsAcceptRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "organization-get",
      OrganizerDashboardRequestArgs<typeof organizerDashboardOrganizationGetRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "event-list",
      OrganizerDashboardRequestArgs<typeof organizerDashboardEventListRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "event-get",
      OrganizerDashboardRequestArgs<typeof organizerDashboardEventGetRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "event-create",
      OrganizerDashboardRequestArgs<typeof organizerDashboardEventCreateRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "event-update",
      OrganizerDashboardRequestArgs<typeof organizerDashboardEventUpdateRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "event-publish",
      OrganizerDashboardRequestArgs<typeof organizerDashboardEventPublishRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "event-archive",
      OrganizerDashboardRequestArgs<typeof organizerDashboardEventArchiveRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "tier-upsert",
      OrganizerDashboardRequestArgs<typeof organizerDashboardTierUpsertRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "tier-archive",
      OrganizerDashboardRequestArgs<typeof organizerDashboardTierArchiveRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "admin-list",
      OrganizerDashboardRequestArgs<typeof organizerDashboardAdminListRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "admin-detail",
      OrganizerDashboardRequestArgs<typeof organizerDashboardAdminDetailRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "admin-configure",
      OrganizerDashboardRequestArgs<typeof organizerDashboardAdminConfigureRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "admin-approve",
      OrganizerDashboardRequestArgs<typeof organizerDashboardAdminApproveRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "admin-block",
      OrganizerDashboardRequestArgs<typeof organizerDashboardAdminBlockRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "admin-unblock",
      OrganizerDashboardRequestArgs<typeof organizerDashboardAdminUnblockRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "migration-plan",
      OrganizerDashboardRequestArgs<typeof organizerDashboardMigrationPlanRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "migration-apply",
      OrganizerDashboardRequestArgs<typeof organizerDashboardMigrationApplyRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "migration-backfill",
      OrganizerDashboardRequestArgs<typeof organizerDashboardMigrationBackfillRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "guest-quota-list",
      OrganizerDashboardRequestArgs<typeof organizerDashboardGuestQuotaListRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "guest-quota-upsert",
      OrganizerDashboardRequestArgs<typeof organizerDashboardGuestQuotaUpsertRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "guest-quota-delete",
      OrganizerDashboardRequestArgs<typeof organizerDashboardGuestQuotaDeleteRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "guest-list",
      OrganizerDashboardRequestArgs<typeof organizerDashboardGuestListRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "guest-upsert",
      OrganizerDashboardRequestArgs<typeof organizerDashboardGuestUpsertRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "guest-delete",
      OrganizerDashboardRequestArgs<typeof organizerDashboardGuestDeleteRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "guest-ticket-send",
      OrganizerDashboardRequestArgs<typeof organizerDashboardGuestTicketSendRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "guest-check-in",
      OrganizerDashboardRequestArgs<typeof organizerDashboardGuestCheckInRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "guest-check-in-undo",
      OrganizerDashboardRequestArgs<typeof organizerDashboardGuestCheckInUndoRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "message-list",
      OrganizerDashboardRequestArgs<typeof organizerDashboardMessageListRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "message-get",
      OrganizerDashboardRequestArgs<typeof organizerDashboardMessageGetRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "message-create",
      OrganizerDashboardRequestArgs<typeof organizerDashboardMessageCreateRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "message-update",
      OrganizerDashboardRequestArgs<typeof organizerDashboardMessageUpdateRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "message-schedule",
      OrganizerDashboardRequestArgs<typeof organizerDashboardMessageScheduleRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "message-send",
      OrganizerDashboardRequestArgs<typeof organizerDashboardMessageSendRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "message-delete",
      OrganizerDashboardRequestArgs<typeof organizerDashboardMessageDeleteRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "message-ics-get",
      OrganizerDashboardRequestArgs<typeof organizerDashboardMessageIcsGetRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "message-reminder-get",
      OrganizerDashboardRequestArgs<typeof organizerDashboardMessageReminderGetRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "message-reminder-update",
      OrganizerDashboardRequestArgs<typeof organizerDashboardMessageReminderUpdateRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "overview-get",
      OrganizerDashboardRequestArgs<typeof organizerDashboardOverviewGetRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "event-stats-get",
      OrganizerDashboardRequestArgs<typeof organizerDashboardEventStatsGetRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "export-list",
      OrganizerDashboardRequestArgs<typeof organizerDashboardExportListRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "public-profile-get",
      OrganizerDashboardRequestArgs<typeof organizerDashboardPublicProfileGetRequestSchema>
    >
  | OrganizerDashboardRequestOf<
      "public-event-get",
      OrganizerDashboardRequestArgs<typeof organizerDashboardPublicEventGetRequestSchema>
    >

/**
 * Validates one interface-layer request body against the same shared model
 * schemas the backend uses (flat contactEmail/contactPhone/iban/bankHolder
 * fields are folded into the nested model shape before the shared check, so
 * CLI, HTTP, and the TS client enforce identical rules). The Bearer credential
 * is never part of the body: strictObject rejects it.
 * errorData carries the machine-readable reason ("invalid-body" or
 * "unknown-operation") so the HTTP layer picks the catalog entry from an
 * authoritative field, never from the message.
 */
export function organizerDashboardRequestParse(body: unknown): Result<OrganizerDashboardRequest> {
  const op = "organizerDashboardRequestParse"
  if (typeof body !== "object" || body === null) {
    return createResultError(op, "Request body must be an object", "invalid-body")
  }
  const requestedOperation = (body as Record<string, unknown>).operation
  if (typeof requestedOperation !== "string" || !organizerDashboardOperationSet.has(requestedOperation)) {
    return createResultError(op, "Unknown operation", "unknown-operation")
  }
  const parsed = v.safeParse(organizerDashboardRequestSchema, body)
  if (!parsed.success) {
    return createResultError(op, v.summarize(parsed.issues), "invalid-body")
  }
  const output = parsed.output
  if (output.operation === "order-refund-request") {
    const { operation, ...args } = output
    return createResult({ operation, args })
  }
  if (output.operation === "order-refund-status") {
    const { operation, ...args } = output
    return createResult({ operation, args })
  }
  if (output.operation === "order-invoice-status") {
    const { operation, ...args } = output
    return createResult({ operation, args })
  }
  if (output.operation === "order-invoice-pdf") {
    const { operation, ...args } = output
    return createResult({ operation, args })
  }
  if (output.operation === "order-invoice-resend") {
    const { operation, ...args } = output
    return createResult({ operation, args })
  }
  if (output.operation === "order-list") {
    const { operation, ...args } = output
    return createResult({ operation, args })
  }
  if (output.operation === "order-get") {
    const { operation, ...args } = output
    return createResult({ operation, args })
  }
  if (output.operation === "order-note-create") {
    const { operation, ...args } = output
    return createResult({ operation, args })
  }
  if (output.operation === "order-note-delete") {
    const { operation, ...args } = output
    return createResult({ operation, args })
  }
  if (output.operation === "order-buyer-contact-update") {
    const { operation, ...args } = output
    return createResult({ operation, args })
  }
  if (output.operation === "order-participant-update") {
    const { operation, ...args } = output
    return createResult({ operation, args })
  }
  if (output.operation === "order-participant-list") {
    const { operation, ...args } = output
    return createResult({ operation, args })
  }
  if (output.operation === "finance-overview") {
    const { operation: financeOverviewOperation, ...financeOverviewArgs } = output
    return createResult({ operation: financeOverviewOperation, args: financeOverviewArgs })
  }
  if (output.operation === "settlement-get") {
    const { operation: settlementGetOperation, ...settlementGetArgs } = output
    return createResult({ operation: settlementGetOperation, args: settlementGetArgs })
  }
  if (output.operation === "payout-list") {
    const { operation: payoutListOperation, ...payoutListArgs } = output
    return createResult({ operation: payoutListOperation, args: payoutListArgs })
  }
  if (output.operation === "payout-record") {
    const { operation: payoutRecordOperation, ...payoutRecordArgs } = output
    return createResult({ operation: payoutRecordOperation, args: payoutRecordArgs })
  }
  if (output.operation === "payout-status-update") {
    const { operation: payoutStatusUpdateOperation, ...payoutStatusUpdateArgs } = output
    return createResult({ operation: payoutStatusUpdateOperation, args: payoutStatusUpdateArgs })
  }
  if (output.operation === "phase-list") {
    const { operation: phaseListOperation, ...phaseListArgs } = output
    return createResult({ operation: phaseListOperation, args: phaseListArgs })
  }
  if (output.operation === "phase-upsert") {
    const { operation: phaseUpsertOperation, ...phaseUpsertArgs } = output
    return createResult({ operation: phaseUpsertOperation, args: phaseUpsertArgs })
  }
  if (output.operation === "phase-archive") {
    const { operation: phaseArchiveOperation, ...phaseArchiveArgs } = output
    return createResult({ operation: phaseArchiveOperation, args: phaseArchiveArgs })
  }
  if (output.operation === "code-list") {
    const { operation: codeListOperation, ...codeListArgs } = output
    return createResult({ operation: codeListOperation, args: codeListArgs })
  }
  if (output.operation === "code-create") {
    const { operation: codeCreateOperation, ...codeCreateArgs } = output
    return createResult({ operation: codeCreateOperation, args: codeCreateArgs })
  }
  if (output.operation === "code-update") {
    const { operation: codeUpdateOperation, ...codeUpdateArgs } = output
    return createResult({ operation: codeUpdateOperation, args: codeUpdateArgs })
  }
  if (output.operation === "code-delete") {
    const { operation: codeDeleteOperation, ...codeDeleteArgs } = output
    return createResult({ operation: codeDeleteOperation, args: codeDeleteArgs })
  }
  if (output.operation === "voucher-list") {
    const { operation: voucherListOperation, ...voucherListArgs } = output
    return createResult({ operation: voucherListOperation, args: voucherListArgs })
  }
  if (output.operation === "voucher-issue") {
    const { operation: voucherIssueOperation, ...voucherIssueArgs } = output
    return createResult({ operation: voucherIssueOperation, args: voucherIssueArgs })
  }
  if (output.operation === "voucher-redeem") {
    const { operation: voucherRedeemOperation, ...voucherRedeemArgs } = output
    return createResult({ operation: voucherRedeemOperation, args: voucherRedeemArgs })
  }
  if (output.operation === "voucher-deactivate") {
    const { operation: voucherDeactivateOperation, ...voucherDeactivateArgs } = output
    return createResult({ operation: voucherDeactivateOperation, args: voucherDeactivateArgs })
  }
  if (output.operation === "team-member-list") {
    const { operation, ...args } = output
    return createResult({ operation, args })
  }
  if (output.operation === "team-invitation-list") {
    const { operation, ...args } = output
    return createResult({ operation, args })
  }
  if (output.operation === "team-invite") {
    const { operation, ...args } = output
    return createResult({ operation, args })
  }
  if (output.operation === "team-role-update") {
    const { operation, ...args } = output
    return createResult({ operation, args })
  }
  if (output.operation === "team-member-remove") {
    const { operation, ...args } = output
    return createResult({ operation, args })
  }
  if (output.operation === "team-invitation-revoke") {
    const { operation, ...args } = output
    return createResult({ operation, args })
  }
  if (output.operation === "team-invitation-resend") {
    const { operation, ...args } = output
    return createResult({ operation, args })
  }
  if (output.operation === "team-invitation-inbox") {
    const { operation, ...args } = output
    return createResult({ operation, args })
  }
  if (output.operation === "team-invitation-accept") {
    const { operation, ...args } = output
    return createResult({ operation, args })
  }
  if (output.operation === "context") {
    const { operation: contextOperation, ...contextArgs } = output
    return createResult({ operation: contextOperation, args: contextArgs })
  }
  if (output.operation === "create") {
    const nested = organizerDashboardOrganizationNestedCreate(output)
    const modelParsed = v.safeParse(organizerDashboardOrganizationCreateSchema, nested)
    if (!modelParsed.success) {
      return createResultError(op, v.summarize(modelParsed.issues), "invalid-body")
    }
    const { operation: createOperation, ...createArgs } = output
    return createResult({ operation: createOperation, args: createArgs })
  }
  if (output.operation === "update") {
    const nested = organizerDashboardOrganizationNestedUpdate(output)
    const modelParsed = v.safeParse(organizerDashboardOrganizationUpdateSchema, nested)
    if (!modelParsed.success) {
      return createResultError(op, v.summarize(modelParsed.issues), "invalid-body")
    }
    const { operation: updateOperation, ...updateArgs } = output
    return createResult({ operation: updateOperation, args: updateArgs })
  }
  if (output.operation === "contracts-accept") {
    const { operation: contractsAcceptOperation, ...contractsAcceptArgs } = output
    return createResult({ operation: contractsAcceptOperation, args: contractsAcceptArgs })
  }
  if (output.operation === "event-create") {
    const { operation: eventCreateOperation, orgId: _eventCreateOrgId, ...eventCreateFields } = output
    const modelParsed = v.safeParse(organizerDashboardEventCreateSchema, eventCreateFields)
    if (!modelParsed.success) {
      return createResultError(op, v.summarize(modelParsed.issues), "invalid-body")
    }
    const { operation: eventCreateOp, ...eventCreateArgs } = output
    return createResult({ operation: eventCreateOp, args: eventCreateArgs })
  }
  if (output.operation === "event-update") {
    const { operation: _eventUpdateOp, orgId: _eventUpdateOrgId, eventKey: _eventUpdateKey, ...patchFields } = output
    const modelParsed = v.safeParse(organizerDashboardEventPatchSchema, patchFields)
    if (!modelParsed.success) {
      return createResultError(op, v.summarize(modelParsed.issues), "invalid-body")
    }
    const { operation: eventUpdateOperation, ...eventUpdateArgs } = output
    return createResult({ operation: eventUpdateOperation, args: eventUpdateArgs })
  }
  if (output.operation === "tier-upsert") {
    const { operation: _tierUpsertOp, orgId: _tierUpsertOrgId, eventKey: _tierUpsertKey, ...tierFields } = output
    const modelParsed = v.safeParse(organizerDashboardTierUpsertSchema, tierFields)
    if (!modelParsed.success) {
      return createResultError(op, v.summarize(modelParsed.issues), "invalid-body")
    }
    const { operation: tierUpsertOperation, ...tierUpsertArgs } = output
    return createResult({ operation: tierUpsertOperation, args: tierUpsertArgs })
  }
  if (output.operation === "tier-archive") {
    const { operation: _tierArchiveOp, orgId: _tierArchiveOrgId, eventKey: _tierArchiveKey, ...tierKeyFields } = output
    const modelParsed = v.safeParse(organizerDashboardTierArchiveSchema, tierKeyFields)
    if (!modelParsed.success) {
      return createResultError(op, v.summarize(modelParsed.issues), "invalid-body")
    }
    const { operation: tierArchiveOperation, ...tierArchiveArgs } = output
    return createResult({ operation: tierArchiveOperation, args: tierArchiveArgs })
  }
  if (output.operation === "admin-configure") {
    const { operation: _adminConfigureOp, ...configureFields } = output
    const modelParsed = v.safeParse(organizerDashboardAdminConfigureSchema, configureFields)
    if (!modelParsed.success) {
      return createResultError(op, v.summarize(modelParsed.issues), "invalid-body")
    }
    const { operation: adminConfigureOperation, ...adminConfigureArgs } = output
    return createResult({ operation: adminConfigureOperation, args: adminConfigureArgs })
  }
  if (output.operation === "migration-apply") {
    const { operation: _migrationApplyOp, ...manifestFields } = output
    const modelParsed = v.safeParse(organizerDashboardMigrationManifestSchema, manifestFields)
    if (!modelParsed.success) {
      return createResultError(op, v.summarize(modelParsed.issues), "invalid-body")
    }
    const { operation: migrationApplyOperation, ...migrationApplyArgs } = output
    return createResult({ operation: migrationApplyOperation, args: migrationApplyArgs })
  }
  if (output.operation === "organization-get") {
    const { operation: organizationGetOperation, ...organizationGetArgs } = output
    return createResult({ operation: organizationGetOperation, args: organizationGetArgs })
  }
  if (output.operation === "event-list") {
    const { operation: eventListOperation, ...eventListArgs } = output
    return createResult({ operation: eventListOperation, args: eventListArgs })
  }
  if (output.operation === "event-get") {
    const { operation: eventGetOperation, ...eventGetArgs } = output
    return createResult({ operation: eventGetOperation, args: eventGetArgs })
  }
  if (output.operation === "event-publish") {
    const { operation: eventPublishOperation, ...eventPublishArgs } = output
    return createResult({ operation: eventPublishOperation, args: eventPublishArgs })
  }
  if (output.operation === "event-archive") {
    const { operation: eventArchiveOperation, ...eventArchiveArgs } = output
    return createResult({ operation: eventArchiveOperation, args: eventArchiveArgs })
  }
  if (output.operation === "admin-list") {
    const { operation: adminListOperation, ...adminListArgs } = output
    return createResult({ operation: adminListOperation, args: adminListArgs })
  }
  if (output.operation === "admin-detail") {
    const { operation: adminDetailOperation, ...adminDetailArgs } = output
    return createResult({ operation: adminDetailOperation, args: adminDetailArgs })
  }
  if (output.operation === "admin-approve") {
    const { operation: adminApproveOperation, ...adminApproveArgs } = output
    return createResult({ operation: adminApproveOperation, args: adminApproveArgs })
  }
  if (output.operation === "admin-block") {
    const { operation: adminBlockOperation, ...adminBlockArgs } = output
    return createResult({ operation: adminBlockOperation, args: adminBlockArgs })
  }
  if (output.operation === "admin-unblock") {
    const { operation: adminUnblockOperation, ...adminUnblockArgs } = output
    return createResult({ operation: adminUnblockOperation, args: adminUnblockArgs })
  }
  if (output.operation === "migration-plan") {
    const { operation: migrationPlanOperation, ...migrationPlanArgs } = output
    return createResult({ operation: migrationPlanOperation, args: migrationPlanArgs })
  }
  if (output.operation === "migration-backfill") {
    const { operation: migrationBackfillOperation, ...migrationBackfillArgs } = output
    return createResult({ operation: migrationBackfillOperation, args: migrationBackfillArgs })
  }
  if (organizerDashboardGuestMessageOperationSet.has(output.operation)) {
    // The body already passed the variant schema and the operation is in the
    // guest/message set, so splitting off the operation yields exactly the
    // matching Request member. The cast goes through unknown because
    // valibot's optional modifiers make the two spellings opaque to the
    // checker; the runtime shape is verified by the passing suite.
    const { operation, ...args } = output
    return createResult({ operation, args } as unknown as OrganizerDashboardRequest)
  }
  if (output.operation === "overview-get") {
    const { operation: overviewGetOperation, ...overviewGetArgs } = output
    return createResult({ operation: overviewGetOperation, args: overviewGetArgs })
  }
  if (output.operation === "event-stats-get") {
    const { operation: eventStatsGetOperation, ...eventStatsGetArgs } = output
    return createResult({ operation: eventStatsGetOperation, args: eventStatsGetArgs })
  }
  if (output.operation === "export-list") {
    const { operation: exportListOperation, ...exportListArgs } = output
    return createResult({ operation: exportListOperation, args: exportListArgs })
  }
  if (output.operation === "public-profile-get") {
    const { operation: publicProfileGetOperation, ...publicProfileGetArgs } = output
    return createResult({ operation: publicProfileGetOperation, args: publicProfileGetArgs })
  }
  if (output.operation === "public-event-get") {
    const { operation: publicEventGetOperation, ...publicEventGetArgs } = output
    return createResult({ operation: publicEventGetOperation, args: publicEventGetArgs })
  }
  return createResultError(op, "Unknown operation", "unknown-operation")
}

function organizerDashboardOrganizationNestedCreate(output: {
  readonly name: string
  readonly slug: string
  readonly kind: v.InferOutput<typeof organizerDashboardOrganizationKindSchema>
  readonly contactEmail?: string | undefined
  readonly contactPhone?: string | undefined
  readonly imprint?: string | undefined
  readonly iban?: string | undefined
  readonly bankHolder?: string | undefined
  readonly termsRevision: string
  readonly dpaRevision: string
  readonly termsAccepted: true
  readonly dpaAccepted: true
}): unknown {
  return {
    name: output.name,
    slug: output.slug,
    kind: output.kind,
    ...(output.contactEmail !== undefined || output.contactPhone !== undefined
      ? {
          contact: {
            ...(output.contactEmail !== undefined ? { email: output.contactEmail } : {}),
            ...(output.contactPhone !== undefined ? { phone: output.contactPhone } : {}),
          },
        }
      : {}),
    ...(output.imprint !== undefined ? { imprint: output.imprint } : {}),
    ...(output.iban !== undefined || output.bankHolder !== undefined
      ? {
          bank: {
            ...(output.iban !== undefined ? { iban: output.iban } : {}),
            ...(output.bankHolder !== undefined ? { holder: output.bankHolder } : {}),
          },
        }
      : {}),
    termsRevision: output.termsRevision,
    dpaRevision: output.dpaRevision,
    termsAccepted: output.termsAccepted,
    dpaAccepted: output.dpaAccepted,
  }
}

function organizerDashboardOrganizationNestedUpdate(output: {
  readonly orgId: string
  readonly name?: string | undefined
  readonly kind?: v.InferOutput<typeof organizerDashboardOrganizationKindSchema> | undefined
  readonly contactEmail?: string | undefined
  readonly contactPhone?: string | undefined
  readonly imprint?: string | undefined
  readonly iban?: string | undefined
  readonly bankHolder?: string | undefined
}): unknown {
  return {
    orgId: output.orgId,
    ...(output.name !== undefined ||
    output.kind !== undefined ||
    output.contactEmail !== undefined ||
    output.contactPhone !== undefined ||
    output.imprint !== undefined
      ? {
          profile: {
            ...(output.name !== undefined ? { name: output.name } : {}),
            ...(output.kind !== undefined ? { kind: output.kind } : {}),
            ...(output.contactEmail !== undefined || output.contactPhone !== undefined
              ? {
                  contact: {
                    ...(output.contactEmail !== undefined ? { email: output.contactEmail } : {}),
                    ...(output.contactPhone !== undefined ? { phone: output.contactPhone } : {}),
                  },
                }
              : {}),
            ...(output.imprint !== undefined ? { imprint: output.imprint } : {}),
          },
        }
      : {}),
    ...(output.iban !== undefined || output.bankHolder !== undefined
      ? {
          bank: {
            ...(output.iban !== undefined ? { iban: output.iban } : {}),
            ...(output.bankHolder !== undefined ? { holder: output.bankHolder } : {}),
          },
        }
      : {}),
  }
}
