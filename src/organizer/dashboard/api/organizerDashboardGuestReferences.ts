import { organizerDashboardGuestFunctionReference } from "../guests/organizerDashboardGuestFunctionReference.ts"
import type { organizerDashboardGuestCheckInMutation } from "../guests/convex/organizerDashboardGuestCheckInMutation.ts"
import type { organizerDashboardGuestCheckInUndoMutation } from "../guests/convex/organizerDashboardGuestCheckInMutation.ts"
import type { organizerDashboardGuestDeleteMutation } from "../guests/convex/organizerDashboardGuestDeleteMutation.ts"
import type { organizerDashboardGuestListQuery } from "../guests/convex/organizerDashboardGuestListQuery.ts"
import type { organizerDashboardGuestQuotaDeleteMutation } from "../guests/convex/organizerDashboardGuestQuotaDeleteMutation.ts"
import type { organizerDashboardGuestQuotaListQuery } from "../guests/convex/organizerDashboardGuestQuotaListQuery.ts"
import type { organizerDashboardGuestQuotaUpsertMutation } from "../guests/convex/organizerDashboardGuestQuotaUpsertMutation.ts"
import type { organizerDashboardGuestTicketSendMutation } from "../guests/convex/organizerDashboardGuestTicketSendMutation.ts"
import type { organizerDashboardGuestUpsertMutation } from "../guests/convex/organizerDashboardGuestUpsertMutation.ts"

/** Canonical references derived from backend exports until the parent refreshes generated API types. */
export const organizerDashboardGuestReferences = {
  organizerDashboardGuestQuotaListQuery: organizerDashboardGuestFunctionReference<
    typeof organizerDashboardGuestQuotaListQuery
  >("organizerDashboardGuests:organizerDashboardGuestQuotaListQuery"),
  organizerDashboardGuestQuotaUpsertMutation: organizerDashboardGuestFunctionReference<
    typeof organizerDashboardGuestQuotaUpsertMutation
  >("organizerDashboardGuests:organizerDashboardGuestQuotaUpsertMutation"),
  organizerDashboardGuestQuotaDeleteMutation: organizerDashboardGuestFunctionReference<
    typeof organizerDashboardGuestQuotaDeleteMutation
  >("organizerDashboardGuests:organizerDashboardGuestQuotaDeleteMutation"),
  organizerDashboardGuestListQuery: organizerDashboardGuestFunctionReference<typeof organizerDashboardGuestListQuery>(
    "organizerDashboardGuests:organizerDashboardGuestListQuery",
  ),
  organizerDashboardGuestUpsertMutation: organizerDashboardGuestFunctionReference<
    typeof organizerDashboardGuestUpsertMutation
  >("organizerDashboardGuests:organizerDashboardGuestUpsertMutation"),
  organizerDashboardGuestDeleteMutation: organizerDashboardGuestFunctionReference<
    typeof organizerDashboardGuestDeleteMutation
  >("organizerDashboardGuests:organizerDashboardGuestDeleteMutation"),
  organizerDashboardGuestTicketSendMutation: organizerDashboardGuestFunctionReference<
    typeof organizerDashboardGuestTicketSendMutation
  >("organizerDashboardGuests:organizerDashboardGuestTicketSendMutation"),
  organizerDashboardGuestCheckInMutation: organizerDashboardGuestFunctionReference<
    typeof organizerDashboardGuestCheckInMutation
  >("organizerDashboardGuests:organizerDashboardGuestCheckInMutation"),
  organizerDashboardGuestCheckInUndoMutation: organizerDashboardGuestFunctionReference<
    typeof organizerDashboardGuestCheckInUndoMutation
  >("organizerDashboardGuests:organizerDashboardGuestCheckInUndoMutation"),
}
