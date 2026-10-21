import { organizerDashboardMessageFunctionReference } from "../messages/organizerDashboardMessageFunctionReference.ts"
import type { organizerDashboardMessageCreateMutation } from "../messages/convex/organizerDashboardMessageCreateMutation.ts"
import type { organizerDashboardMessageDeleteMutation } from "../messages/convex/organizerDashboardMessageDeleteMutation.ts"
import type { organizerDashboardMessageGetQuery } from "../messages/convex/organizerDashboardMessageGetQuery.ts"
import type { organizerDashboardMessageIcsGetQuery } from "../messages/convex/organizerDashboardMessageIcsGetQuery.ts"
import type { organizerDashboardMessageListQuery } from "../messages/convex/organizerDashboardMessageListQuery.ts"
import type { organizerDashboardMessageReminderGetQuery } from "../messages/convex/organizerDashboardMessageReminderGetQuery.ts"
import type { organizerDashboardMessageReminderUpdateMutation } from "../messages/convex/organizerDashboardMessageReminderUpdateMutation.ts"
import type { organizerDashboardMessageScheduleMutation } from "../messages/convex/organizerDashboardMessageScheduleMutation.ts"
import type { organizerDashboardMessageSendMutation } from "../messages/convex/organizerDashboardMessageSendMutation.ts"
import type { organizerDashboardMessageUpdateMutation } from "../messages/convex/organizerDashboardMessageUpdateMutation.ts"

/** Canonical references derived from backend exports until the parent refreshes generated API types. */
export const organizerDashboardMessageReferences = {
  organizerDashboardMessageListQuery: organizerDashboardMessageFunctionReference<
    typeof organizerDashboardMessageListQuery
  >("organizerDashboardMessages:organizerDashboardMessageListQuery"),
  organizerDashboardMessageGetQuery: organizerDashboardMessageFunctionReference<
    typeof organizerDashboardMessageGetQuery
  >("organizerDashboardMessages:organizerDashboardMessageGetQuery"),
  organizerDashboardMessageCreateMutation: organizerDashboardMessageFunctionReference<
    typeof organizerDashboardMessageCreateMutation
  >("organizerDashboardMessages:organizerDashboardMessageCreateMutation"),
  organizerDashboardMessageUpdateMutation: organizerDashboardMessageFunctionReference<
    typeof organizerDashboardMessageUpdateMutation
  >("organizerDashboardMessages:organizerDashboardMessageUpdateMutation"),
  organizerDashboardMessageScheduleMutation: organizerDashboardMessageFunctionReference<
    typeof organizerDashboardMessageScheduleMutation
  >("organizerDashboardMessages:organizerDashboardMessageScheduleMutation"),
  organizerDashboardMessageSendMutation: organizerDashboardMessageFunctionReference<
    typeof organizerDashboardMessageSendMutation
  >("organizerDashboardMessages:organizerDashboardMessageSendMutation"),
  organizerDashboardMessageDeleteMutation: organizerDashboardMessageFunctionReference<
    typeof organizerDashboardMessageDeleteMutation
  >("organizerDashboardMessages:organizerDashboardMessageDeleteMutation"),
  organizerDashboardMessageIcsGetQuery: organizerDashboardMessageFunctionReference<
    typeof organizerDashboardMessageIcsGetQuery
  >("organizerDashboardMessages:organizerDashboardMessageIcsGetQuery"),
  organizerDashboardMessageReminderGetQuery: organizerDashboardMessageFunctionReference<
    typeof organizerDashboardMessageReminderGetQuery
  >("organizerDashboardMessages:organizerDashboardMessageReminderGetQuery"),
  organizerDashboardMessageReminderUpdateMutation: organizerDashboardMessageFunctionReference<
    typeof organizerDashboardMessageReminderUpdateMutation
  >("organizerDashboardMessages:organizerDashboardMessageReminderUpdateMutation"),
}
