import { organizerDashboardMessageFunctionReference } from "#src/organizer/dashboard/messages/organizerDashboardMessageFunctionReference.ts"
import type { organizerDashboardMessageDeliverAction } from "#src/organizer/dashboard/messages/organizerDashboardMessageDeliverAction.ts"

/**
 * Internal reference of the message delivery action.
 * The action module is only imported as a type, so the scheduled function
 * does not pull the action into the mutation bundle.
 */
export const organizerDashboardMessageDeliverActionReference = organizerDashboardMessageFunctionReference<
  typeof organizerDashboardMessageDeliverAction
>("organizerDashboardMessages:organizerDashboardMessageDeliverAction")
