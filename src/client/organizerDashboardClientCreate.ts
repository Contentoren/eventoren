import type { ConvexHttpClient } from "convex/browser"
import * as v from "valibot"
import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { organizerDashboardAdminConfigureSchema } from "#src/organizer/dashboard/admin/organizerDashboardAdminConfigureSchema.ts"
import { organizerContractConsentSchema } from "#src/organizer/dashboard/contracts/organizerContractConsentSchema.ts"
import { organizerDashboardEventCreateSchema } from "#src/organizer/dashboard/events/model/organizerDashboardEventCreateSchema.ts"
import { organizerDashboardEventListFilterSchema } from "#src/organizer/dashboard/events/model/organizerDashboardEventListFilterSchema.ts"
import { organizerDashboardEventPatchSchema } from "#src/organizer/dashboard/events/model/organizerDashboardEventPatchSchema.ts"
import { organizerDashboardTierArchiveSchema } from "#src/organizer/dashboard/events/model/organizerDashboardTierArchiveSchema.ts"
import { organizerDashboardTierUpsertSchema } from "#src/organizer/dashboard/events/model/organizerDashboardTierUpsertSchema.ts"
import { organizerDashboardMigrationManifestSchema } from "#src/organizer/dashboard/migration/organizerDashboardMigrationManifestSchema.ts"
import { organizerDashboardOrganizationBankSchema } from "#src/organizer/dashboard/model/organizerDashboardOrganizationBankSchema.ts"
import { organizerDashboardOrganizationContactSchema } from "#src/organizer/dashboard/model/organizerDashboardOrganizationContactSchema.ts"
import { organizerDashboardOrganizationCreateSchema } from "#src/organizer/dashboard/model/organizerDashboardOrganizationCreateSchema.ts"
import { organizerDashboardOrganizationKindSchema } from "#src/organizer/dashboard/model/organizerDashboardOrganizationKindSchema.ts"
import { organizerDashboardOrganizationStatusSchema } from "#src/organizer/dashboard/model/organizerDashboardOrganizationStatusSchema.ts"
import type { organizerDashboardTeamReferences } from "#src/organizer/dashboard/api/organizerDashboardTeamReferences.ts"
import { organizerDashboardTeamInvitationActionSchema } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationActionSchema.ts"
import { organizerDashboardTeamInviteSchema } from "#src/organizer/dashboard/team/organizerDashboardTeamInviteSchema.ts"
import { organizerDashboardTeamMemberRemoveSchema } from "#src/organizer/dashboard/team/organizerDashboardTeamMemberRemoveSchema.ts"
import { organizerDashboardTeamRoleUpdateSchema } from "#src/organizer/dashboard/team/organizerDashboardTeamRoleUpdateSchema.ts"
import { organizerDashboardExportInputSchemas } from "#src/organizer/dashboard/api/organizerDashboardExportInputSchemas.ts"
import { organizerDashboardBillingInputSchemas } from "#src/organizer/dashboard/api/organizerDashboardBillingInputSchemas.ts"
import { organizerDashboardFinanceInputSchemas } from "#src/organizer/dashboard/api/organizerDashboardFinanceInputSchemas.ts"
import { organizerDashboardGuestReferences } from "#src/organizer/dashboard/api/organizerDashboardGuestReferences.ts"
import { organizerDashboardGuestInputSchemas } from "#src/organizer/dashboard/api/organizerDashboardGuestInputSchemas.ts"
import { organizerDashboardMessageInputSchemas } from "#src/organizer/dashboard/api/organizerDashboardMessageInputSchemas.ts"
import { organizerDashboardMessageReferences } from "#src/organizer/dashboard/api/organizerDashboardMessageReferences.ts"
import { organizerDashboardOverviewInputSchemas } from "#src/organizer/dashboard/api/organizerDashboardOverviewInputSchemas.ts"
import { organizerDashboardPublicInputSchemas } from "#src/organizer/dashboard/api/organizerDashboardPublicInputSchemas.ts"
import { organizerDashboardPricingInputSchemas } from "#src/organizer/dashboard/api/organizerDashboardPricingInputSchemas.ts"
import { organizerDashboardOrderInputSchemas } from "#src/organizer/dashboard/api/organizerDashboardOrderInputSchemas.ts"
import type { ApiClientResult } from "./apiClient.js"

type OrganizerDashboardOrderRef = typeof api.organizerDashboardOrders
type OrganizerDashboardOrderClientMethod<Ref, Schema extends v.GenericSchema> = (
  args: v.InferInput<Schema>,
) => Promise<ApiClientResult<OrganizerDashboardData<Ref>>>

type OrganizerDashboardBillingRef = typeof api.organizerDashboardBilling
type OrganizerDashboardBillingClientMethod<Ref, Schema extends v.GenericSchema> = (
  args: v.InferInput<Schema>,
) => Promise<ApiClientResult<OrganizerDashboardData<Ref>>>

type OrganizerDashboardFinanceRef = typeof api.organizerDashboardFinance
type OrganizerDashboardFinanceClientMethod<Ref, Schema extends v.GenericSchema> = (
  args: v.InferInput<Schema>,
) => Promise<ApiClientResult<OrganizerDashboardData<Ref>>>

type OrganizerDashboardPricingRef = typeof api.organizerDashboardPricing
type OrganizerDashboardPricingClientMethod<Ref, Schema extends v.GenericSchema> = (
  args: v.InferInput<Schema>,
) => Promise<ApiClientResult<OrganizerDashboardData<Ref>>>

type OrganizerDashboardGuestRef = typeof organizerDashboardGuestReferences
type OrganizerDashboardGuestClientMethod<Ref, Schema extends v.GenericSchema> = (
  args: v.InferInput<Schema>,
) => Promise<ApiClientResult<OrganizerDashboardData<Ref>>>

type OrganizerDashboardMessageRef = typeof organizerDashboardMessageReferences
type OrganizerDashboardMessageClientMethod<Ref, Schema extends v.GenericSchema> = (
  args: v.InferInput<Schema>,
) => Promise<ApiClientResult<OrganizerDashboardData<Ref>>>

type OrganizerDashboardOverviewRef = typeof api.organizerDashboardOverview
type OrganizerDashboardOverviewClientMethod<Ref, Schema extends v.GenericSchema> = (
  args: v.InferInput<Schema>,
) => Promise<ApiClientResult<OrganizerDashboardData<Ref>>>

type OrganizerDashboardExportsRef = typeof api.organizerDashboardExports
type OrganizerDashboardExportsClientMethod<Ref, Schema extends v.GenericSchema> = (
  args: v.InferInput<Schema>,
) => Promise<ApiClientResult<OrganizerDashboardData<Ref>>>

type OrganizerDashboardPublicRef = typeof api.organizerDashboardPublic
type OrganizerDashboardPublicClientMethod<Ref, Schema extends v.GenericSchema> = (
  args: v.InferInput<Schema>,
) => Promise<ApiClientResult<OrganizerDashboardData<Ref>>>

// anyApi resolves canonical module names at runtime. Extend only its type until
// parent codegen sees team; the server-side reference factory is type-only here.
const organizerDashboardClientTeamApi = (
  api as typeof api & {
    readonly organizerDashboardTeam: typeof organizerDashboardTeamReferences
  }
).organizerDashboardTeam

type OrganizerDashboardTeamRef = typeof organizerDashboardTeamReferences

type OrganizerDashboardTeamClientMethod<
  Ref extends OrganizerDashboardTeamRef[keyof OrganizerDashboardTeamRef],
  Schema extends v.GenericSchema,
> = (args: v.InferInput<Schema>) => Promise<ApiClientResult<OrganizerDashboardData<Ref>>>

/**
 * Structural equivalents of convex/server FunctionArgs/FunctionReturnType for
 * api.organizerDashboard* references. convex/server is a server SDK and must
 * not be imported from src/client (webapp boundary), so the slots on the
 * generated references are read directly instead.
 */
type OrganizerDashboardContextQueryRef = typeof api.organizerDashboard.organizerDashboardContextQuery
type OrganizerDashboardOrganizationCreateRef =
  typeof api.organizerDashboard.organizerDashboardOrganizationCreateMutation
type OrganizerDashboardOrganizationUpdateRef =
  typeof api.organizerDashboard.organizerDashboardOrganizationUpdateMutation
type OrganizerDashboardOrganizationGetRef = typeof api.organizerDashboardProfile.organizerDashboardOrganizationGetQuery
type OrganizerDashboardContractsAcceptRef = typeof api.organizerDashboard.organizerContractsAcceptMutation
type OrganizerDashboardEventListRef = typeof api.organizerDashboardEvents.organizerDashboardEventListQuery
type OrganizerDashboardEventGetRef = typeof api.organizerDashboardEvents.organizerDashboardEventGetQuery
type OrganizerDashboardEventCreateRef = typeof api.organizerDashboardEvents.organizerDashboardEventCreateMutation
type OrganizerDashboardEventUpdateRef = typeof api.organizerDashboardEvents.organizerDashboardEventUpdateMutation
type OrganizerDashboardEventPublishRef = typeof api.organizerDashboardEvents.organizerDashboardEventPublishMutation
type OrganizerDashboardEventArchiveRef = typeof api.organizerDashboardEvents.organizerDashboardEventArchiveMutation
type OrganizerDashboardTierUpsertRef = typeof api.organizerDashboardEvents.organizerDashboardTierUpsertMutation
type OrganizerDashboardTierArchiveRef = typeof api.organizerDashboardEvents.organizerDashboardTierArchiveMutation
type OrganizerDashboardAdminListRef = typeof api.organizerDashboardAdmin.organizerDashboardAdminListQuery
type OrganizerDashboardAdminDetailRef = typeof api.organizerDashboardAdmin.organizerDashboardAdminDetailQuery
type OrganizerDashboardAdminConfigureRef = typeof api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation
type OrganizerDashboardAdminApproveRef = typeof api.organizerDashboardAdmin.organizerDashboardAdminApproveMutation
type OrganizerDashboardAdminBlockRef = typeof api.organizerDashboardAdmin.organizerDashboardAdminBlockMutation
type OrganizerDashboardAdminUnblockRef = typeof api.organizerDashboardAdmin.organizerDashboardAdminUnblockMutation
type OrganizerDashboardMigrationPlanRef = typeof api.organizerDashboardMigration.organizerDashboardMigrationPlanQuery
type OrganizerDashboardMigrationApplyRef =
  typeof api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation
type OrganizerDashboardMigrationBackfillRef =
  typeof api.organizerDashboardMigration.organizerDashboardMigrationBackfillMutation
type OrganizerDashboardOverviewGetRef = OrganizerDashboardOverviewRef["organizerDashboardOverviewQuery"]
type OrganizerDashboardEventStatsGetRef = OrganizerDashboardOverviewRef["organizerDashboardEventStatsQuery"]
type OrganizerDashboardExportListRef = OrganizerDashboardExportsRef["organizerDashboardExportListQuery"]
type OrganizerDashboardPublicProfileGetRef = OrganizerDashboardPublicRef["organizerDashboardPublicProfileQuery"]
type OrganizerDashboardPublicEventGetRef = OrganizerDashboardPublicRef["organizerDashboardPublicEventQuery"]

type OrganizerDashboardContextQueryArgs = OrganizerDashboardContextQueryRef["_args"]
type OrganizerDashboardOrganizationCreateArgs = OrganizerDashboardOrganizationCreateRef["_args"]
type OrganizerDashboardOrganizationUpdateArgs = OrganizerDashboardOrganizationUpdateRef["_args"]
type OrganizerDashboardOrganizationGetArgs = OrganizerDashboardOrganizationGetRef["_args"]
type OrganizerDashboardEventListArgs = OrganizerDashboardEventListRef["_args"]
type OrganizerDashboardEventGetArgs = OrganizerDashboardEventGetRef["_args"]
type OrganizerDashboardEventCreateArgs = OrganizerDashboardEventCreateRef["_args"]
type OrganizerDashboardEventUpdateArgs = OrganizerDashboardEventUpdateRef["_args"]
type OrganizerDashboardEventPublishArgs = OrganizerDashboardEventPublishRef["_args"]
type OrganizerDashboardEventArchiveArgs = OrganizerDashboardEventArchiveRef["_args"]
type OrganizerDashboardTierUpsertArgs = OrganizerDashboardTierUpsertRef["_args"]
type OrganizerDashboardTierArchiveArgs = OrganizerDashboardTierArchiveRef["_args"]
type OrganizerDashboardAdminListArgs = OrganizerDashboardAdminListRef["_args"]
type OrganizerDashboardAdminDetailArgs = OrganizerDashboardAdminDetailRef["_args"]
type OrganizerDashboardAdminConfigureArgs = OrganizerDashboardAdminConfigureRef["_args"]
type OrganizerDashboardAdminApproveArgs = OrganizerDashboardAdminApproveRef["_args"]
type OrganizerDashboardAdminBlockArgs = OrganizerDashboardAdminBlockRef["_args"]
type OrganizerDashboardAdminUnblockArgs = OrganizerDashboardAdminUnblockRef["_args"]
type OrganizerDashboardMigrationPlanArgs = OrganizerDashboardMigrationPlanRef["_args"]
type OrganizerDashboardMigrationApplyArgs = OrganizerDashboardMigrationApplyRef["_args"]
type OrganizerDashboardMigrationBackfillArgs = OrganizerDashboardMigrationBackfillRef["_args"]

type OrganizerDashboardData<TRef> = TRef extends { _returnType: unknown }
  ? Extract<Awaited<TRef["_returnType"]>, { success: true }> extends { data: infer TData }
    ? TData
    : never
  : never

export type OrganizerDashboardClient = {
  readonly orderList: OrganizerDashboardOrderClientMethod<
    OrganizerDashboardOrderRef["organizerDashboardOrderListQuery"],
    typeof organizerDashboardOrderInputSchemas.orderList
  >
  readonly orderGet: OrganizerDashboardOrderClientMethod<
    OrganizerDashboardOrderRef["organizerDashboardOrderGetQuery"],
    typeof organizerDashboardOrderInputSchemas.orderGet
  >
  readonly orderNoteCreate: OrganizerDashboardOrderClientMethod<
    OrganizerDashboardOrderRef["organizerDashboardOrderNoteCreateMutation"],
    typeof organizerDashboardOrderInputSchemas.orderNoteCreate
  >
  readonly orderNoteDelete: OrganizerDashboardOrderClientMethod<
    OrganizerDashboardOrderRef["organizerDashboardOrderNoteDeleteMutation"],
    typeof organizerDashboardOrderInputSchemas.orderNoteDelete
  >
  readonly orderBuyerContactUpdate: OrganizerDashboardOrderClientMethod<
    OrganizerDashboardOrderRef["organizerDashboardOrderBuyerContactUpdateMutation"],
    typeof organizerDashboardOrderInputSchemas.orderBuyerContactUpdate
  >
  readonly orderParticipantUpdate: OrganizerDashboardOrderClientMethod<
    OrganizerDashboardOrderRef["organizerDashboardOrderParticipantUpdateMutation"],
    typeof organizerDashboardOrderInputSchemas.orderParticipantUpdate
  >
  readonly orderParticipantList: OrganizerDashboardOrderClientMethod<
    OrganizerDashboardOrderRef["organizerDashboardOrderParticipantListQuery"],
    typeof organizerDashboardOrderInputSchemas.orderParticipantList
  >
  readonly orderRefundRequest: OrganizerDashboardBillingClientMethod<
    OrganizerDashboardBillingRef["organizerDashboardOrderRefundRequestAction"],
    typeof organizerDashboardBillingInputSchemas.billingRefundRequest
  >
  readonly orderRefundStatus: OrganizerDashboardBillingClientMethod<
    OrganizerDashboardBillingRef["organizerDashboardOrderRefundStatusAction"],
    typeof organizerDashboardBillingInputSchemas.billingRefundStatus
  >
  readonly orderInvoiceStatus: OrganizerDashboardBillingClientMethod<
    OrganizerDashboardBillingRef["organizerDashboardOrderInvoiceStatusAction"],
    typeof organizerDashboardBillingInputSchemas.billingInvoiceStatus
  >
  readonly orderInvoicePdf: OrganizerDashboardBillingClientMethod<
    OrganizerDashboardBillingRef["organizerDashboardOrderInvoicePdfAction"],
    typeof organizerDashboardBillingInputSchemas.billingInvoicePdf
  >
  readonly orderInvoiceResend: OrganizerDashboardBillingClientMethod<
    OrganizerDashboardBillingRef["organizerDashboardOrderInvoiceResendAction"],
    typeof organizerDashboardBillingInputSchemas.billingInvoiceResend
  >
  readonly financeOverview: OrganizerDashboardFinanceClientMethod<
    OrganizerDashboardFinanceRef["organizerDashboardFinanceOverviewQuery"],
    typeof organizerDashboardFinanceInputSchemas.financeOverview
  >
  readonly settlementGet: OrganizerDashboardFinanceClientMethod<
    OrganizerDashboardFinanceRef["organizerDashboardSettlementGetQuery"],
    typeof organizerDashboardFinanceInputSchemas.settlementGet
  >
  readonly payoutList: OrganizerDashboardFinanceClientMethod<
    OrganizerDashboardFinanceRef["organizerDashboardPayoutListQuery"],
    typeof organizerDashboardFinanceInputSchemas.payoutList
  >
  readonly payoutRecord: OrganizerDashboardFinanceClientMethod<
    OrganizerDashboardFinanceRef["organizerDashboardPayoutRecordMutation"],
    typeof organizerDashboardFinanceInputSchemas.payoutRecord
  >
  readonly payoutStatusUpdate: OrganizerDashboardFinanceClientMethod<
    OrganizerDashboardFinanceRef["organizerDashboardPayoutStatusUpdateMutation"],
    typeof organizerDashboardPricingInputSchemas.payoutStatusUpdate
  >
  readonly phaseList: OrganizerDashboardPricingClientMethod<
    OrganizerDashboardPricingRef["organizerDashboardPhaseListQuery"],
    typeof organizerDashboardPricingInputSchemas.phaseList
  >
  readonly phaseUpsert: OrganizerDashboardPricingClientMethod<
    OrganizerDashboardPricingRef["organizerDashboardPhaseUpsertMutation"],
    typeof organizerDashboardPricingInputSchemas.phaseUpsert
  >
  readonly phaseArchive: OrganizerDashboardPricingClientMethod<
    OrganizerDashboardPricingRef["organizerDashboardPhaseArchiveMutation"],
    typeof organizerDashboardPricingInputSchemas.phaseArchive
  >
  readonly codeList: OrganizerDashboardPricingClientMethod<
    OrganizerDashboardPricingRef["organizerDashboardCodeListQuery"],
    typeof organizerDashboardPricingInputSchemas.codeList
  >
  readonly codeCreate: OrganizerDashboardPricingClientMethod<
    OrganizerDashboardPricingRef["organizerDashboardCodeCreateMutation"],
    typeof organizerDashboardPricingInputSchemas.codeCreate
  >
  readonly codeUpdate: OrganizerDashboardPricingClientMethod<
    OrganizerDashboardPricingRef["organizerDashboardCodeUpdateMutation"],
    typeof organizerDashboardPricingInputSchemas.codeUpdate
  >
  readonly codeDelete: OrganizerDashboardPricingClientMethod<
    OrganizerDashboardPricingRef["organizerDashboardCodeDeleteMutation"],
    typeof organizerDashboardPricingInputSchemas.codeDelete
  >
  readonly voucherList: OrganizerDashboardPricingClientMethod<
    OrganizerDashboardPricingRef["organizerDashboardVoucherListQuery"],
    typeof organizerDashboardPricingInputSchemas.voucherList
  >
  readonly voucherIssue: OrganizerDashboardPricingClientMethod<
    OrganizerDashboardPricingRef["organizerDashboardVoucherIssueMutation"],
    typeof organizerDashboardPricingInputSchemas.voucherIssue
  >
  readonly voucherRedeem: OrganizerDashboardPricingClientMethod<
    OrganizerDashboardPricingRef["organizerDashboardVoucherRedeemMutation"],
    typeof organizerDashboardPricingInputSchemas.voucherRedeem
  >
  readonly voucherDeactivate: OrganizerDashboardPricingClientMethod<
    OrganizerDashboardPricingRef["organizerDashboardVoucherDeactivateMutation"],
    typeof organizerDashboardPricingInputSchemas.voucherDeactivate
  >
  readonly teamMemberList: OrganizerDashboardTeamClientMethod<
    OrganizerDashboardTeamRef["organizerDashboardTeamMemberListQuery"],
    typeof organizerDashboardClientTeamListSchema
  >
  readonly teamInvitationList: OrganizerDashboardTeamClientMethod<
    OrganizerDashboardTeamRef["organizerDashboardTeamInvitationListQuery"],
    typeof organizerDashboardClientTeamListSchema
  >
  readonly teamInvite: OrganizerDashboardTeamClientMethod<
    OrganizerDashboardTeamRef["organizerDashboardTeamInviteMutation"],
    typeof organizerDashboardClientTeamInviteSchema
  >
  readonly teamRoleUpdate: OrganizerDashboardTeamClientMethod<
    OrganizerDashboardTeamRef["organizerDashboardTeamRoleUpdateMutation"],
    typeof organizerDashboardClientTeamRoleUpdateSchema
  >
  readonly teamMemberRemove: OrganizerDashboardTeamClientMethod<
    OrganizerDashboardTeamRef["organizerDashboardTeamMemberRemoveMutation"],
    typeof organizerDashboardClientTeamMemberRemoveSchema
  >
  readonly teamInvitationRevoke: OrganizerDashboardTeamClientMethod<
    OrganizerDashboardTeamRef["organizerDashboardTeamInvitationRevokeMutation"],
    typeof organizerDashboardClientTeamInvitationActionSchema
  >
  readonly teamInvitationResend: OrganizerDashboardTeamClientMethod<
    OrganizerDashboardTeamRef["organizerDashboardTeamInvitationResendMutation"],
    typeof organizerDashboardClientTeamInvitationActionSchema
  >
  readonly teamInvitationInbox: OrganizerDashboardTeamClientMethod<
    OrganizerDashboardTeamRef["organizerDashboardTeamInvitationInboxQuery"],
    typeof organizerDashboardClientMigrationPlanSchema
  >
  readonly teamInvitationAccept: OrganizerDashboardTeamClientMethod<
    OrganizerDashboardTeamRef["organizerDashboardTeamInvitationAcceptMutation"],
    typeof organizerDashboardClientTeamInvitationAcceptSchema
  >
  readonly guestQuotaList: OrganizerDashboardGuestClientMethod<
    OrganizerDashboardGuestRef["organizerDashboardGuestQuotaListQuery"],
    typeof organizerDashboardGuestInputSchemas.quotaList
  >
  readonly guestQuotaUpsert: OrganizerDashboardGuestClientMethod<
    OrganizerDashboardGuestRef["organizerDashboardGuestQuotaUpsertMutation"],
    typeof organizerDashboardGuestInputSchemas.quotaUpsert
  >
  readonly guestQuotaDelete: OrganizerDashboardGuestClientMethod<
    OrganizerDashboardGuestRef["organizerDashboardGuestQuotaDeleteMutation"],
    typeof organizerDashboardGuestInputSchemas.quotaDelete
  >
  readonly guestList: OrganizerDashboardGuestClientMethod<
    OrganizerDashboardGuestRef["organizerDashboardGuestListQuery"],
    typeof organizerDashboardGuestInputSchemas.guestList
  >
  readonly guestUpsert: OrganizerDashboardGuestClientMethod<
    OrganizerDashboardGuestRef["organizerDashboardGuestUpsertMutation"],
    typeof organizerDashboardGuestInputSchemas.guestUpsert
  >
  readonly guestDelete: OrganizerDashboardGuestClientMethod<
    OrganizerDashboardGuestRef["organizerDashboardGuestDeleteMutation"],
    typeof organizerDashboardGuestInputSchemas.guestDelete
  >
  readonly guestTicketSend: OrganizerDashboardGuestClientMethod<
    OrganizerDashboardGuestRef["organizerDashboardGuestTicketSendMutation"],
    typeof organizerDashboardGuestInputSchemas.guestTicketSend
  >
  readonly guestCheckIn: OrganizerDashboardGuestClientMethod<
    OrganizerDashboardGuestRef["organizerDashboardGuestCheckInMutation"],
    typeof organizerDashboardGuestInputSchemas.guestCheckIn
  >
  readonly guestCheckInUndo: OrganizerDashboardGuestClientMethod<
    OrganizerDashboardGuestRef["organizerDashboardGuestCheckInUndoMutation"],
    typeof organizerDashboardGuestInputSchemas.guestCheckInUndo
  >
  readonly messageList: OrganizerDashboardMessageClientMethod<
    OrganizerDashboardMessageRef["organizerDashboardMessageListQuery"],
    typeof organizerDashboardMessageInputSchemas.messageList
  >
  readonly messageGet: OrganizerDashboardMessageClientMethod<
    OrganizerDashboardMessageRef["organizerDashboardMessageGetQuery"],
    typeof organizerDashboardMessageInputSchemas.messageGet
  >
  readonly messageCreate: OrganizerDashboardMessageClientMethod<
    OrganizerDashboardMessageRef["organizerDashboardMessageCreateMutation"],
    typeof organizerDashboardMessageInputSchemas.messageCreate
  >
  readonly messageUpdate: OrganizerDashboardMessageClientMethod<
    OrganizerDashboardMessageRef["organizerDashboardMessageUpdateMutation"],
    typeof organizerDashboardMessageInputSchemas.messageUpdate
  >
  readonly messageSchedule: OrganizerDashboardMessageClientMethod<
    OrganizerDashboardMessageRef["organizerDashboardMessageScheduleMutation"],
    typeof organizerDashboardMessageInputSchemas.messageSchedule
  >
  readonly messageSend: OrganizerDashboardMessageClientMethod<
    OrganizerDashboardMessageRef["organizerDashboardMessageSendMutation"],
    typeof organizerDashboardMessageInputSchemas.messageSend
  >
  readonly messageDelete: OrganizerDashboardMessageClientMethod<
    OrganizerDashboardMessageRef["organizerDashboardMessageDeleteMutation"],
    typeof organizerDashboardMessageInputSchemas.messageDelete
  >
  readonly messageIcsGet: OrganizerDashboardMessageClientMethod<
    OrganizerDashboardMessageRef["organizerDashboardMessageIcsGetQuery"],
    typeof organizerDashboardMessageInputSchemas.messageIcsGet
  >
  readonly messageReminderGet: OrganizerDashboardMessageClientMethod<
    OrganizerDashboardMessageRef["organizerDashboardMessageReminderGetQuery"],
    typeof organizerDashboardMessageInputSchemas.messageReminderGet
  >
  readonly messageReminderUpdate: OrganizerDashboardMessageClientMethod<
    OrganizerDashboardMessageRef["organizerDashboardMessageReminderUpdateMutation"],
    typeof organizerDashboardMessageInputSchemas.messageReminderUpdate
  >
  readonly contextGet: (args: {
    readonly orgId?: string
  }) => Promise<ApiClientResult<OrganizerDashboardData<OrganizerDashboardContextQueryRef>>>
  readonly organizationCreate: (
    args: Omit<OrganizerDashboardOrganizationCreateArgs, "token">,
  ) => Promise<ApiClientResult<OrganizerDashboardData<OrganizerDashboardOrganizationCreateRef>>>
  readonly organizationUpdate: (
    args: Omit<OrganizerDashboardOrganizationUpdateArgs, "token" | "orgId"> & {
      readonly orgId: string
    },
  ) => Promise<ApiClientResult<OrganizerDashboardData<OrganizerDashboardOrganizationUpdateRef>>>
  readonly organizationGet: (args: {
    readonly orgId: string
  }) => Promise<ApiClientResult<OrganizerDashboardData<OrganizerDashboardOrganizationGetRef>>>
  readonly contractsAccept: (
    args: { readonly orgId: string } & v.InferOutput<typeof organizerContractConsentSchema>,
  ) => Promise<ApiClientResult<OrganizerDashboardData<OrganizerDashboardContractsAcceptRef>>>
  readonly eventList: (
    args: Omit<OrganizerDashboardEventListArgs, "token" | "orgId" | "paginationOpts"> & {
      readonly orgId: string
      readonly numItems?: number
      readonly cursor?: string | null
      readonly endCursor?: string | null
    },
  ) => Promise<ApiClientResult<OrganizerDashboardData<OrganizerDashboardEventListRef>>>
  readonly eventGet: (
    args: Omit<OrganizerDashboardEventGetArgs, "token" | "orgId"> & { readonly orgId: string },
  ) => Promise<ApiClientResult<OrganizerDashboardData<OrganizerDashboardEventGetRef>>>
  readonly eventCreate: (
    args: Omit<OrganizerDashboardEventCreateArgs, "token" | "orgId"> & { readonly orgId: string },
  ) => Promise<ApiClientResult<OrganizerDashboardData<OrganizerDashboardEventCreateRef>>>
  readonly eventUpdate: (
    args: Omit<OrganizerDashboardEventUpdateArgs, "token" | "orgId"> & { readonly orgId: string },
  ) => Promise<ApiClientResult<OrganizerDashboardData<OrganizerDashboardEventUpdateRef>>>
  readonly eventPublish: (
    args: Omit<OrganizerDashboardEventPublishArgs, "token" | "orgId"> & { readonly orgId: string },
  ) => Promise<ApiClientResult<OrganizerDashboardData<OrganizerDashboardEventPublishRef>>>
  readonly eventArchive: (
    args: Omit<OrganizerDashboardEventArchiveArgs, "token" | "orgId"> & { readonly orgId: string },
  ) => Promise<ApiClientResult<OrganizerDashboardData<OrganizerDashboardEventArchiveRef>>>
  readonly tierUpsert: (
    args: Omit<OrganizerDashboardTierUpsertArgs, "token" | "orgId"> & { readonly orgId: string },
  ) => Promise<ApiClientResult<OrganizerDashboardData<OrganizerDashboardTierUpsertRef>>>
  readonly tierArchive: (
    args: Omit<OrganizerDashboardTierArchiveArgs, "token" | "orgId"> & { readonly orgId: string },
  ) => Promise<ApiClientResult<OrganizerDashboardData<OrganizerDashboardTierArchiveRef>>>
  readonly adminList: (
    args: Omit<OrganizerDashboardAdminListArgs, "token" | "paginationOpts"> & {
      readonly numItems?: number
      readonly cursor?: string | null
      readonly endCursor?: string | null
    },
  ) => Promise<ApiClientResult<OrganizerDashboardData<OrganizerDashboardAdminListRef>>>
  readonly adminDetail: (args: {
    readonly orgId: string
  }) => Promise<ApiClientResult<OrganizerDashboardData<OrganizerDashboardAdminDetailRef>>>
  readonly adminConfigure: (
    args: Omit<OrganizerDashboardAdminConfigureArgs, "token" | "orgId"> & { readonly orgId: string },
  ) => Promise<ApiClientResult<OrganizerDashboardData<OrganizerDashboardAdminConfigureRef>>>
  readonly adminApprove: (args: {
    readonly orgId: string
  }) => Promise<ApiClientResult<OrganizerDashboardData<OrganizerDashboardAdminApproveRef>>>
  readonly adminBlock: (
    args: Omit<OrganizerDashboardAdminBlockArgs, "token" | "orgId"> & { readonly orgId: string },
  ) => Promise<ApiClientResult<OrganizerDashboardData<OrganizerDashboardAdminBlockRef>>>
  readonly adminUnblock: (
    args: Omit<OrganizerDashboardAdminUnblockArgs, "token" | "orgId"> & { readonly orgId: string },
  ) => Promise<ApiClientResult<OrganizerDashboardData<OrganizerDashboardAdminUnblockRef>>>
  readonly migrationPlan: (args: {
    readonly numItems?: number
    readonly cursor?: string | null
    readonly endCursor?: string | null
  }) => Promise<ApiClientResult<OrganizerDashboardData<OrganizerDashboardMigrationPlanRef>>>
  readonly migrationApply: (
    args: Omit<
      OrganizerDashboardMigrationApplyArgs,
      "token" | "orgInits" | "eventAssignments" | "roleAssignments" | "scannerLinkApprovals"
    > & {
      readonly orgInits: readonly { readonly orgId: string; readonly kind: string }[]
      readonly eventAssignments: readonly { readonly eventKey: string; readonly orgId: string }[]
      readonly roleAssignments: readonly { readonly userId: string; readonly orgId: string; readonly role: string }[]
      readonly scannerLinkApprovals?: readonly {
        readonly linkId: string
        readonly eventKey: string
        readonly orgId: string
      }[]
    },
  ) => Promise<ApiClientResult<OrganizerDashboardData<OrganizerDashboardMigrationApplyRef>>>
  readonly migrationBackfill: (
    args: Omit<OrganizerDashboardMigrationBackfillArgs, "token">,
  ) => Promise<ApiClientResult<OrganizerDashboardData<OrganizerDashboardMigrationBackfillRef>>>
  readonly overviewGet: OrganizerDashboardOverviewClientMethod<
    OrganizerDashboardOverviewGetRef,
    typeof organizerDashboardOverviewInputSchemas.overviewGet
  >
  readonly eventStatsGet: OrganizerDashboardOverviewClientMethod<
    OrganizerDashboardEventStatsGetRef,
    typeof organizerDashboardOverviewInputSchemas.eventStatsGet
  >
  readonly exportList: OrganizerDashboardExportsClientMethod<
    OrganizerDashboardExportListRef,
    typeof organizerDashboardExportInputSchemas.exportList
  >
  readonly publicProfileGet: OrganizerDashboardPublicClientMethod<
    OrganizerDashboardPublicProfileGetRef,
    typeof organizerDashboardPublicInputSchemas.publicProfileGet
  >
  readonly publicEventGet: OrganizerDashboardPublicClientMethod<
    OrganizerDashboardPublicEventGetRef,
    typeof organizerDashboardPublicInputSchemas.publicEventGet
  >
}

const organizerDashboardClientOrgIdSchema = v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty"))

const organizerDashboardClientEventKeySchema = v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty"))

const organizerDashboardClientNumItemsSchema = v.optional(
  v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(50)),
  25,
)

const organizerDashboardClientCursorSchema = v.optional(v.nullable(v.string()))

const organizerDashboardClientContextSchema = v.strictObject({
  orgId: v.optional(organizerDashboardClientOrgIdSchema),
})

const organizerDashboardClientIdSchema = v.strictObject({
  orgId: organizerDashboardClientOrgIdSchema,
})

const organizerDashboardClientEventListSchema = v.strictObject({
  orgId: organizerDashboardClientOrgIdSchema,
  status: v.optional(organizerDashboardEventListFilterSchema.entries.status),
  search: v.optional(organizerDashboardEventListFilterSchema.entries.search),
  sort: v.optional(organizerDashboardEventListFilterSchema.entries.sort),
  fromStartsAt: v.optional(organizerDashboardEventListFilterSchema.entries.fromStartsAt),
  toStartsAt: v.optional(organizerDashboardEventListFilterSchema.entries.toStartsAt),
  numItems: organizerDashboardClientNumItemsSchema,
  cursor: organizerDashboardClientCursorSchema,
  endCursor: organizerDashboardClientCursorSchema,
})

const organizerDashboardClientEventKeyArgsSchema = v.strictObject({
  orgId: organizerDashboardClientOrgIdSchema,
  eventKey: organizerDashboardClientEventKeySchema,
})

const organizerDashboardClientEventCreateSchema = v.strictObject({
  orgId: organizerDashboardClientOrgIdSchema,
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

const organizerDashboardClientEventUpdateSchema = v.strictObject({
  orgId: organizerDashboardClientOrgIdSchema,
  eventKey: organizerDashboardClientEventKeySchema,
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

const organizerDashboardClientTierUpsertSchema = v.strictObject({
  orgId: organizerDashboardClientOrgIdSchema,
  eventKey: organizerDashboardClientEventKeySchema,
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

const organizerDashboardClientTierArchiveSchema = v.strictObject({
  orgId: organizerDashboardClientOrgIdSchema,
  eventKey: organizerDashboardClientEventKeySchema,
  tierKey: organizerDashboardTierArchiveSchema.entries.tierKey,
})

const organizerDashboardClientAdminListSchema = v.strictObject({
  status: v.optional(organizerDashboardOrganizationStatusSchema),
  numItems: organizerDashboardClientNumItemsSchema,
  cursor: organizerDashboardClientCursorSchema,
  endCursor: organizerDashboardClientCursorSchema,
})

const organizerDashboardClientAdminConfigureSchema = v.strictObject({
  orgId: organizerDashboardAdminConfigureSchema.entries.orgId,
  tax: organizerDashboardAdminConfigureSchema.entries.tax,
  fee: organizerDashboardAdminConfigureSchema.entries.fee,
})

const organizerDashboardClientAdminBlockSchema = v.strictObject({
  orgId: organizerDashboardClientOrgIdSchema,
  reason: v.pipe(v.string(), v.trim(), v.minLength(1, "Cannot be empty"), v.maxLength(2000, "Too long")),
})

const organizerDashboardClientAdminUnblockSchema = v.strictObject({
  orgId: organizerDashboardClientOrgIdSchema,
  status: organizerDashboardOrganizationStatusSchema,
})

const organizerDashboardClientMigrationPlanSchema = v.strictObject({
  numItems: organizerDashboardClientNumItemsSchema,
  cursor: organizerDashboardClientCursorSchema,
  endCursor: organizerDashboardClientCursorSchema,
})

const organizerDashboardClientMigrationApplySchema = v.strictObject({
  orgInits: organizerDashboardMigrationManifestSchema.entries.orgInits,
  eventAssignments: organizerDashboardMigrationManifestSchema.entries.eventAssignments,
  roleAssignments: organizerDashboardMigrationManifestSchema.entries.roleAssignments,
  scannerLinkApprovals: organizerDashboardMigrationManifestSchema.entries.scannerLinkApprovals,
})

const organizerDashboardClientMigrationBackfillSchema = v.strictObject({
  eventKey: organizerDashboardClientEventKeySchema,
  cursor: organizerDashboardClientCursorSchema,
  pageSize: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100))),
})

const organizerDashboardClientOrganizationUpdateSchema = v.strictObject({
  orgId: organizerDashboardClientOrgIdSchema,
  name: v.optional(organizerDashboardOrganizationCreateSchema.entries.name),
  kind: v.optional(organizerDashboardOrganizationKindSchema),
  contactEmail: organizerDashboardOrganizationContactSchema.entries.email,
  contactPhone: organizerDashboardOrganizationContactSchema.entries.phone,
  imprint: v.optional(organizerDashboardOrganizationCreateSchema.entries.imprint),
  iban: v.optional(organizerDashboardOrganizationBankSchema.entries.iban),
  bankHolder: v.optional(organizerDashboardOrganizationBankSchema.entries.holder),
})

const organizerDashboardClientTeamListSchema = v.strictObject({
  orgId: organizerDashboardClientOrgIdSchema,
  ...organizerDashboardClientMigrationPlanSchema.entries,
})
const organizerDashboardClientTeamInviteSchema = v.strictObject({
  orgId: organizerDashboardClientOrgIdSchema,
  ...organizerDashboardTeamInviteSchema.entries,
})
const organizerDashboardClientTeamRoleUpdateSchema = v.strictObject({
  orgId: organizerDashboardClientOrgIdSchema,
  ...organizerDashboardTeamRoleUpdateSchema.entries,
})
const organizerDashboardClientTeamMemberRemoveSchema = v.strictObject({
  orgId: organizerDashboardClientOrgIdSchema,
  ...organizerDashboardTeamMemberRemoveSchema.entries,
})
const organizerDashboardClientTeamInvitationActionSchema = v.strictObject({
  orgId: organizerDashboardClientOrgIdSchema,
  ...organizerDashboardTeamInvitationActionSchema.entries,
})
const organizerDashboardClientTeamInvitationAcceptSchema = v.strictObject(
  organizerDashboardTeamInvitationActionSchema.entries,
)

const organizerDashboardClientTransportMessage = "Backend transport failed"
const organizerDashboardClientCredentialMessage = "Missing auth credential"

/**
 * Typed client for the allowlisted organizer dashboard backend operations. The caller
 * supplies an explicit ConvexHttpClient and an explicit auth credential
 * (value or provider); this module reads no environment and imports no
 * server code, so it stays inside the webapp client boundary.
 *
 * Every method validates its inputs against the same shared valibot model
 * entries the backend uses before any SDK call (invalid input is a local
 * 400, no transport). A missing or blank credential is a local 401 without a
 * transport call. Backend Result rejections are returned as data with the
 * backend message; SDK throws are sanitized to a constant message so raw SDK
 * error text (which may echo call args, including the credential) never
 * reaches callers. try/catch wraps only the SDK transport call.
 */
export function organizerDashboardClientCreate(inputs: {
  readonly client: ConvexHttpClient
  readonly token: string | (() => string | undefined)
}): OrganizerDashboardClient {
  const tokenRead = (): string | undefined => {
    const raw = typeof inputs.token === "string" ? inputs.token : inputs.token()
    if (raw === undefined) return undefined
    const trimmed = raw.trim()
    return trimmed.length === 0 ? undefined : trimmed
  }

  const credentialGet = ():
    | { readonly success: true; readonly token: string }
    | { readonly success: false; readonly error: { readonly status: 401; readonly message: string } } => {
    const token = tokenRead()
    if (token === undefined) {
      return { success: false, error: { status: 401, message: organizerDashboardClientCredentialMessage } }
    }
    return { success: true, token }
  }

  const invalidInput = (message: string): { readonly status: 400; readonly message: string } => ({
    status: 400,
    message,
  })

  const transportFailure = (): { readonly status: 503; readonly message: string } => ({
    status: 503,
    message: organizerDashboardClientTransportMessage,
  })

  const backendFailure = (response: {
    readonly errorMessage: string
  }): { readonly status: 503; readonly message: string } => ({
    status: 503,
    message: response.errorMessage,
  })

  return {
    orderList: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardOrderInputSchemas.orderList, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      const { orgId, numItems, cursor, endCursor, ...filter } = validated.output
      try {
        const response = await inputs.client.query(api.organizerDashboardOrders.organizerDashboardOrderListQuery, {
          token: credential.token,
          orgId: orgId as Id<"orgs">,
          ...filter,
          paginationOpts: { numItems, cursor: cursor ?? null, ...(endCursor != null ? { endCursor } : {}) },
        })
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    orderGet: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardOrderInputSchemas.orderGet, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.query(api.organizerDashboardOrders.organizerDashboardOrderGetQuery, {
          ...validated.output,
          token: credential.token,
          orgId: validated.output.orgId as Id<"orgs">,
          orderId: validated.output.orderId as Id<"ticketOrders">,
        })
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    orderNoteCreate: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardOrderInputSchemas.orderNoteCreate, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardOrders.organizerDashboardOrderNoteCreateMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            orderId: validated.output.orderId as Id<"ticketOrders">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    orderNoteDelete: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardOrderInputSchemas.orderNoteDelete, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardOrders.organizerDashboardOrderNoteDeleteMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            orderId: validated.output.orderId as Id<"ticketOrders">,
            noteId: validated.output.noteId as Id<"organizerDashboardOrderNotes">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    orderBuyerContactUpdate: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardOrderInputSchemas.orderBuyerContactUpdate, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardOrders.organizerDashboardOrderBuyerContactUpdateMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            orderId: validated.output.orderId as Id<"ticketOrders">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    orderParticipantUpdate: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardOrderInputSchemas.orderParticipantUpdate, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardOrders.organizerDashboardOrderParticipantUpdateMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            orderId: validated.output.orderId as Id<"ticketOrders">,
            ticketId: validated.output.ticketId as Id<"ticketIssued">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    orderParticipantList: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardOrderInputSchemas.orderParticipantList, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      const { orgId, numItems, cursor, endCursor, ...filter } = validated.output
      try {
        const response = await inputs.client.query(
          api.organizerDashboardOrders.organizerDashboardOrderParticipantListQuery,
          {
            token: credential.token,
            orgId: orgId as Id<"orgs">,
            ...filter,
            paginationOpts: { numItems, cursor: cursor ?? null, ...(endCursor != null ? { endCursor } : {}) },
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    orderRefundRequest: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardBillingInputSchemas.billingRefundRequest, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.action(
          api.organizerDashboardBilling.organizerDashboardOrderRefundRequestAction,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            orderId: validated.output.orderId as Id<"ticketOrders">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    orderRefundStatus: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardBillingInputSchemas.billingRefundStatus, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.action(
          api.organizerDashboardBilling.organizerDashboardOrderRefundStatusAction,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            orderId: validated.output.orderId as Id<"ticketOrders">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    orderInvoiceStatus: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardBillingInputSchemas.billingInvoiceStatus, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.action(
          api.organizerDashboardBilling.organizerDashboardOrderInvoiceStatusAction,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            orderId: validated.output.orderId as Id<"ticketOrders">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    orderInvoicePdf: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardBillingInputSchemas.billingInvoicePdf, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.action(
          api.organizerDashboardBilling.organizerDashboardOrderInvoicePdfAction,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            orderId: validated.output.orderId as Id<"ticketOrders">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    orderInvoiceResend: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardBillingInputSchemas.billingInvoiceResend, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.action(
          api.organizerDashboardBilling.organizerDashboardOrderInvoiceResendAction,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            orderId: validated.output.orderId as Id<"ticketOrders">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    financeOverview: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardFinanceInputSchemas.financeOverview, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.query(
          api.organizerDashboardFinance.organizerDashboardFinanceOverviewQuery,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    settlementGet: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardFinanceInputSchemas.settlementGet, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.query(api.organizerDashboardFinance.organizerDashboardSettlementGetQuery, {
          ...validated.output,
          token: credential.token,
          orgId: validated.output.orgId as Id<"orgs">,
        })
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    payoutList: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardFinanceInputSchemas.payoutList, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      const { orgId, numItems, cursor, endCursor, ...filter } = validated.output
      try {
        const response = await inputs.client.query(api.organizerDashboardFinance.organizerDashboardPayoutListQuery, {
          token: credential.token,
          orgId: orgId as Id<"orgs">,
          ...filter,
          paginationOpts: { numItems, cursor: cursor ?? null, ...(endCursor != null ? { endCursor } : {}) },
        })
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    payoutRecord: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardFinanceInputSchemas.payoutRecord, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardFinance.organizerDashboardPayoutRecordMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    payoutStatusUpdate: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardPricingInputSchemas.payoutStatusUpdate, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardFinance.organizerDashboardPayoutStatusUpdateMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    phaseList: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardPricingInputSchemas.phaseList, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.query(api.organizerDashboardPricing.organizerDashboardPhaseListQuery, {
          ...validated.output,
          token: credential.token,
          orgId: validated.output.orgId as Id<"orgs">,
        })
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    phaseUpsert: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardPricingInputSchemas.phaseUpsert, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardPricing.organizerDashboardPhaseUpsertMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    phaseArchive: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardPricingInputSchemas.phaseArchive, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardPricing.organizerDashboardPhaseArchiveMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    codeList: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardPricingInputSchemas.codeList, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      const { orgId, numItems, cursor, endCursor, ...filter } = validated.output
      try {
        const response = await inputs.client.query(api.organizerDashboardPricing.organizerDashboardCodeListQuery, {
          token: credential.token,
          orgId: orgId as Id<"orgs">,
          ...filter,
          paginationOpts: { numItems, cursor: cursor ?? null, ...(endCursor != null ? { endCursor } : {}) },
        })
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    codeCreate: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardPricingInputSchemas.codeCreate, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardPricing.organizerDashboardCodeCreateMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    codeUpdate: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardPricingInputSchemas.codeUpdate, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardPricing.organizerDashboardCodeUpdateMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    codeDelete: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardPricingInputSchemas.codeDelete, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardPricing.organizerDashboardCodeDeleteMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    voucherList: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardPricingInputSchemas.voucherList, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      const { orgId, numItems, cursor, endCursor, ...filter } = validated.output
      try {
        const response = await inputs.client.query(api.organizerDashboardPricing.organizerDashboardVoucherListQuery, {
          token: credential.token,
          orgId: orgId as Id<"orgs">,
          ...filter,
          paginationOpts: { numItems, cursor: cursor ?? null, ...(endCursor != null ? { endCursor } : {}) },
        })
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    voucherIssue: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardPricingInputSchemas.voucherIssue, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardPricing.organizerDashboardVoucherIssueMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    voucherRedeem: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardPricingInputSchemas.voucherRedeem, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardPricing.organizerDashboardVoucherRedeemMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    voucherDeactivate: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardPricingInputSchemas.voucherDeactivate, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardPricing.organizerDashboardVoucherDeactivateMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    teamMemberList: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientTeamListSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      const { orgId, numItems, cursor, endCursor } = validated.output
      try {
        const response = await inputs.client.query(
          organizerDashboardClientTeamApi.organizerDashboardTeamMemberListQuery,
          {
            token: credential.token,
            orgId: orgId as Id<"orgs">,
            paginationOpts: { numItems, cursor: cursor ?? null, ...(endCursor != null ? { endCursor } : {}) },
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    teamInvitationList: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientTeamListSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      const { orgId, numItems, cursor, endCursor } = validated.output
      try {
        const response = await inputs.client.query(
          organizerDashboardClientTeamApi.organizerDashboardTeamInvitationListQuery,
          {
            token: credential.token,
            orgId: orgId as Id<"orgs">,
            paginationOpts: { numItems, cursor: cursor ?? null, ...(endCursor != null ? { endCursor } : {}) },
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    teamInvite: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientTeamInviteSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          organizerDashboardClientTeamApi.organizerDashboardTeamInviteMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    teamRoleUpdate: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientTeamRoleUpdateSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          organizerDashboardClientTeamApi.organizerDashboardTeamRoleUpdateMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            memberId: validated.output.memberId as Id<"orgMembers">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    teamMemberRemove: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientTeamMemberRemoveSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          organizerDashboardClientTeamApi.organizerDashboardTeamMemberRemoveMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            memberId: validated.output.memberId as Id<"orgMembers">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    teamInvitationRevoke: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientTeamInvitationActionSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          organizerDashboardClientTeamApi.organizerDashboardTeamInvitationRevokeMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            invitationId: validated.output.invitationId as Id<"organizerDashboardTeamInvitations">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    teamInvitationResend: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientTeamInvitationActionSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          organizerDashboardClientTeamApi.organizerDashboardTeamInvitationResendMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            invitationId: validated.output.invitationId as Id<"organizerDashboardTeamInvitations">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    teamInvitationInbox: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientMigrationPlanSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      const { numItems, cursor, endCursor } = validated.output
      try {
        const response = await inputs.client.query(
          organizerDashboardClientTeamApi.organizerDashboardTeamInvitationInboxQuery,
          {
            token: credential.token,
            paginationOpts: { numItems, cursor: cursor ?? null, ...(endCursor != null ? { endCursor } : {}) },
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    teamInvitationAccept: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientTeamInvitationAcceptSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          organizerDashboardClientTeamApi.organizerDashboardTeamInvitationAcceptMutation,
          {
            token: credential.token,
            invitationId: validated.output.invitationId as Id<"organizerDashboardTeamInvitations">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    guestQuotaList: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardGuestInputSchemas.quotaList, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.query(
          organizerDashboardGuestReferences.organizerDashboardGuestQuotaListQuery,
          { ...validated.output, token: credential.token, orgId: validated.output.orgId as Id<"orgs"> },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    guestQuotaUpsert: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardGuestInputSchemas.quotaUpsert, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      const { quotaId, ...fields } = validated.output
      try {
        const response = await inputs.client.mutation(
          organizerDashboardGuestReferences.organizerDashboardGuestQuotaUpsertMutation,
          {
            ...fields,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            ...(quotaId !== undefined ? { quotaId: quotaId as Id<"organizerDashboardGuestQuotas"> } : {}),
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    guestQuotaDelete: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardGuestInputSchemas.quotaDelete, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          organizerDashboardGuestReferences.organizerDashboardGuestQuotaDeleteMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            quotaId: validated.output.quotaId as Id<"organizerDashboardGuestQuotas">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    guestList: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardGuestInputSchemas.guestList, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.query(organizerDashboardGuestReferences.organizerDashboardGuestListQuery, {
          ...validated.output,
          token: credential.token,
          orgId: validated.output.orgId as Id<"orgs">,
        })
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    guestUpsert: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardGuestInputSchemas.guestUpsert, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      const { guestId, ...fields } = validated.output
      try {
        const response = await inputs.client.mutation(
          organizerDashboardGuestReferences.organizerDashboardGuestUpsertMutation,
          {
            ...fields,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            ...(guestId !== undefined ? { guestId: guestId as Id<"organizerDashboardGuests"> } : {}),
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    guestDelete: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardGuestInputSchemas.guestDelete, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          organizerDashboardGuestReferences.organizerDashboardGuestDeleteMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            guestId: validated.output.guestId as Id<"organizerDashboardGuests">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    guestTicketSend: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardGuestInputSchemas.guestTicketSend, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          organizerDashboardGuestReferences.organizerDashboardGuestTicketSendMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            guestId: validated.output.guestId as Id<"organizerDashboardGuests">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    guestCheckIn: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardGuestInputSchemas.guestCheckIn, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          organizerDashboardGuestReferences.organizerDashboardGuestCheckInMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            guestId: validated.output.guestId as Id<"organizerDashboardGuests">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    guestCheckInUndo: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardGuestInputSchemas.guestCheckInUndo, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          organizerDashboardGuestReferences.organizerDashboardGuestCheckInUndoMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            guestId: validated.output.guestId as Id<"organizerDashboardGuests">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    messageList: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardMessageInputSchemas.messageList, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.query(
          organizerDashboardMessageReferences.organizerDashboardMessageListQuery,
          { ...validated.output, token: credential.token, orgId: validated.output.orgId as Id<"orgs"> },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    messageGet: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardMessageInputSchemas.messageGet, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.query(
          organizerDashboardMessageReferences.organizerDashboardMessageGetQuery,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            messageId: validated.output.messageId as Id<"organizerDashboardMessages">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    messageCreate: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardMessageInputSchemas.messageCreate, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          organizerDashboardMessageReferences.organizerDashboardMessageCreateMutation,
          { ...validated.output, token: credential.token, orgId: validated.output.orgId as Id<"orgs"> },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    messageUpdate: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardMessageInputSchemas.messageUpdate, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          organizerDashboardMessageReferences.organizerDashboardMessageUpdateMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            messageId: validated.output.messageId as Id<"organizerDashboardMessages">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    messageSchedule: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardMessageInputSchemas.messageSchedule, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          organizerDashboardMessageReferences.organizerDashboardMessageScheduleMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            messageId: validated.output.messageId as Id<"organizerDashboardMessages">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    messageSend: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardMessageInputSchemas.messageSend, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          organizerDashboardMessageReferences.organizerDashboardMessageSendMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            messageId: validated.output.messageId as Id<"organizerDashboardMessages">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    messageDelete: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardMessageInputSchemas.messageDelete, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          organizerDashboardMessageReferences.organizerDashboardMessageDeleteMutation,
          {
            ...validated.output,
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            messageId: validated.output.messageId as Id<"organizerDashboardMessages">,
          },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    messageIcsGet: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardMessageInputSchemas.messageIcsGet, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.query(
          organizerDashboardMessageReferences.organizerDashboardMessageIcsGetQuery,
          { ...validated.output, token: credential.token, orgId: validated.output.orgId as Id<"orgs"> },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    messageReminderGet: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardMessageInputSchemas.messageReminderGet, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.query(
          organizerDashboardMessageReferences.organizerDashboardMessageReminderGetQuery,
          { ...validated.output, token: credential.token, orgId: validated.output.orgId as Id<"orgs"> },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    messageReminderUpdate: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardMessageInputSchemas.messageReminderUpdate, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          organizerDashboardMessageReferences.organizerDashboardMessageReminderUpdateMutation,
          { ...validated.output, token: credential.token, orgId: validated.output.orgId as Id<"orgs"> },
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    contextGet: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientContextSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response: OrganizerDashboardContextQueryRef["_returnType"] = await inputs.client.query(
          api.organizerDashboard.organizerDashboardContextQuery,
          {
            token: credential.token,
            ...(validated.output.orgId !== undefined ? { orgId: validated.output.orgId as Id<"orgs"> } : {}),
          } as OrganizerDashboardContextQueryArgs,
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    organizationCreate: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientOrganizationCreateSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboard.organizerDashboardOrganizationCreateMutation,
          { ...validated.output, token: credential.token } as OrganizerDashboardOrganizationCreateArgs,
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    organizationUpdate: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientOrganizationUpdateSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboard.organizerDashboardOrganizationUpdateMutation,
          {
            ...validated.output,
            orgId: validated.output.orgId as Id<"orgs">,
            token: credential.token,
          } as OrganizerDashboardOrganizationUpdateArgs,
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    organizationGet: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientIdSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response: OrganizerDashboardOrganizationGetRef["_returnType"] = await inputs.client.query(
          api.organizerDashboardProfile.organizerDashboardOrganizationGetQuery,
          {
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
          } as OrganizerDashboardOrganizationGetArgs,
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    contractsAccept: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientContractsAcceptSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(api.organizerDashboard.organizerContractsAcceptMutation, {
          token: credential.token,
          orgId: validated.output.orgId as Id<"orgs">,
          termsAccepted: validated.output.termsAccepted,
          dpaAccepted: validated.output.dpaAccepted,
          termsRevision: validated.output.termsRevision,
          dpaRevision: validated.output.dpaRevision,
        })
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    eventList: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientEventListSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      const { orgId, numItems, cursor, endCursor, ...filter } = validated.output
      try {
        const response: OrganizerDashboardEventListRef["_returnType"] = await inputs.client.query(
          api.organizerDashboardEvents.organizerDashboardEventListQuery,
          {
            token: credential.token,
            orgId: orgId as Id<"orgs">,
            ...filter,
            paginationOpts: {
              numItems: numItems ?? 25,
              cursor: cursor ?? null,
              ...(endCursor !== undefined && endCursor !== null ? { endCursor } : {}),
            },
          } as OrganizerDashboardEventListArgs,
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    eventGet: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientEventKeyArgsSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response: OrganizerDashboardEventGetRef["_returnType"] = await inputs.client.query(
          api.organizerDashboardEvents.organizerDashboardEventGetQuery,
          {
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            eventKey: validated.output.eventKey,
          } as OrganizerDashboardEventGetArgs,
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    eventCreate: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientEventCreateSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      const { orgId, ...fields } = validated.output
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardEvents.organizerDashboardEventCreateMutation,
          {
            token: credential.token,
            orgId: orgId as Id<"orgs">,
            ...fields,
          } as OrganizerDashboardEventCreateArgs,
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    eventUpdate: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientEventUpdateSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      const { orgId, ...fields } = validated.output
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardEvents.organizerDashboardEventUpdateMutation,
          {
            token: credential.token,
            orgId: orgId as Id<"orgs">,
            ...fields,
          } as OrganizerDashboardEventUpdateArgs,
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    eventPublish: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientEventKeyArgsSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardEvents.organizerDashboardEventPublishMutation,
          {
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            eventKey: validated.output.eventKey,
          } as OrganizerDashboardEventPublishArgs,
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    eventArchive: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientEventKeyArgsSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardEvents.organizerDashboardEventArchiveMutation,
          {
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            eventKey: validated.output.eventKey,
          } as OrganizerDashboardEventArchiveArgs,
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    tierUpsert: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientTierUpsertSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      const { orgId, ...fields } = validated.output
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardEvents.organizerDashboardTierUpsertMutation,
          {
            token: credential.token,
            orgId: orgId as Id<"orgs">,
            ...fields,
          } as OrganizerDashboardTierUpsertArgs,
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    tierArchive: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientTierArchiveSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardEvents.organizerDashboardTierArchiveMutation,
          {
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            eventKey: validated.output.eventKey,
            tierKey: validated.output.tierKey,
          } as OrganizerDashboardTierArchiveArgs,
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    adminList: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientAdminListSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      const { numItems, cursor, endCursor, ...filter } = validated.output
      try {
        const response: OrganizerDashboardAdminListRef["_returnType"] = await inputs.client.query(
          api.organizerDashboardAdmin.organizerDashboardAdminListQuery,
          {
            token: credential.token,
            ...filter,
            paginationOpts: {
              numItems: numItems ?? 25,
              cursor: cursor ?? null,
              ...(endCursor !== undefined && endCursor !== null ? { endCursor } : {}),
            },
          } as OrganizerDashboardAdminListArgs,
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    adminDetail: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientIdSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response: OrganizerDashboardAdminDetailRef["_returnType"] = await inputs.client.query(
          api.organizerDashboardAdmin.organizerDashboardAdminDetailQuery,
          {
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
          } as OrganizerDashboardAdminDetailArgs,
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    adminConfigure: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientAdminConfigureSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation,
          {
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            tax: validated.output.tax,
            fee: validated.output.fee,
          } as OrganizerDashboardAdminConfigureArgs,
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    adminApprove: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientIdSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardAdmin.organizerDashboardAdminApproveMutation,
          {
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
          } as OrganizerDashboardAdminApproveArgs,
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    adminBlock: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientAdminBlockSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardAdmin.organizerDashboardAdminBlockMutation,
          {
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            reason: validated.output.reason,
          } as OrganizerDashboardAdminBlockArgs,
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    adminUnblock: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientAdminUnblockSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardAdmin.organizerDashboardAdminUnblockMutation,
          {
            token: credential.token,
            orgId: validated.output.orgId as Id<"orgs">,
            status: validated.output.status,
          } as OrganizerDashboardAdminUnblockArgs,
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    migrationPlan: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientMigrationPlanSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      const { numItems, cursor, endCursor } = validated.output
      try {
        const response: OrganizerDashboardMigrationPlanRef["_returnType"] = await inputs.client.query(
          api.organizerDashboardMigration.organizerDashboardMigrationPlanQuery,
          {
            token: credential.token,
            paginationOpts: {
              numItems: numItems ?? 25,
              cursor: cursor ?? null,
              ...(endCursor !== undefined && endCursor !== null ? { endCursor } : {}),
            },
          } as OrganizerDashboardMigrationPlanArgs,
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    migrationApply: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientMigrationApplySchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
          {
            token: credential.token,
            orgInits: validated.output.orgInits.map((entry) => ({
              orgId: entry.orgId as Id<"orgs">,
              kind: entry.kind,
            })),
            eventAssignments: validated.output.eventAssignments.map((entry) => ({
              eventKey: entry.eventKey,
              orgId: entry.orgId as Id<"orgs">,
            })),
            roleAssignments: validated.output.roleAssignments.map((entry) => ({
              userId: entry.userId as Id<"users">,
              orgId: entry.orgId as Id<"orgs">,
              role: entry.role,
            })),
            scannerLinkApprovals: validated.output.scannerLinkApprovals.map((entry) => ({
              linkId: entry.linkId,
              eventKey: entry.eventKey,
              orgId: entry.orgId,
            })),
          } as OrganizerDashboardMigrationApplyArgs,
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    migrationBackfill: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardClientMigrationBackfillSchema, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.mutation(
          api.organizerDashboardMigration.organizerDashboardMigrationBackfillMutation,
          {
            token: credential.token,
            eventKey: validated.output.eventKey,
            ...(validated.output.cursor !== undefined && validated.output.cursor !== null
              ? { cursor: validated.output.cursor }
              : {}),
            ...(validated.output.pageSize !== undefined ? { pageSize: validated.output.pageSize } : {}),
          } as OrganizerDashboardMigrationBackfillArgs,
        )
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    overviewGet: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardOverviewInputSchemas.overviewGet, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.query(api.organizerDashboardOverview.organizerDashboardOverviewQuery, {
          ...validated.output,
          token: credential.token,
          orgId: validated.output.orgId as Id<"orgs">,
        })
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    eventStatsGet: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardOverviewInputSchemas.eventStatsGet, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.query(api.organizerDashboardOverview.organizerDashboardEventStatsQuery, {
          ...validated.output,
          token: credential.token,
          orgId: validated.output.orgId as Id<"orgs">,
        })
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    exportList: async (args) => {
      const credential = credentialGet()
      if (!credential.success) return { success: false, error: credential.error }
      const validated = v.safeParse(organizerDashboardExportInputSchemas.exportList, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      const { orgId, numItems, cursor, endCursor, ...filter } = validated.output
      try {
        const response = await inputs.client.query(api.organizerDashboardExports.organizerDashboardExportListQuery, {
          token: credential.token,
          orgId: orgId as Id<"orgs">,
          ...filter,
          paginationOpts: { numItems, cursor: cursor ?? null, ...(endCursor != null ? { endCursor } : {}) },
        })
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    publicProfileGet: async (args) => {
      const validated = v.safeParse(organizerDashboardPublicInputSchemas.publicProfileGet, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.query(api.organizerDashboardPublic.organizerDashboardPublicProfileQuery, {
          ...validated.output,
        })
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
    publicEventGet: async (args) => {
      const validated = v.safeParse(organizerDashboardPublicInputSchemas.publicEventGet, args)
      if (!validated.success) return { success: false, error: invalidInput(v.summarize(validated.issues)) }
      try {
        const response = await inputs.client.query(api.organizerDashboardPublic.organizerDashboardPublicEventQuery, {
          ...validated.output,
        })
        if (response.success) return { success: true, data: response.data }
        return { success: false, error: backendFailure(response) }
      } catch {
        return { success: false, error: transportFailure() }
      }
    },
  }
}

const organizerDashboardClientOrganizationCreateSchema = v.strictObject({
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

/**
 * Consent input for an existing organization. The entries come from the
 * shared consent schema, so the accepted flags are literal true and the
 * revisions are the exact current document revisions. Nothing is defaulted or
 * injected: a missing or stale revision fails locally before any transport.
 */
const organizerDashboardClientContractsAcceptSchema = v.strictObject({
  orgId: organizerDashboardClientOrgIdSchema,
  ...organizerContractConsentSchema.entries,
})
