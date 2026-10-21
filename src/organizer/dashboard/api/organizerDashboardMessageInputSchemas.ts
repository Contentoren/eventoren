import * as v from "valibot"
import {
  organizerDashboardMessageContentSchema,
  organizerDashboardMessageReminderSchema,
} from "../messages/organizerDashboardMessageSchema.ts"

// Transport IDs are nonempty strings. Convex validates canonical IDs and scope.
const id = v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty"))
const orgEvent = { orgId: id, eventKey: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(160)) }
const message = { orgId: id, messageId: id }
const isoInstant = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1, "Cannot be empty"),
  v.check((value) => !Number.isNaN(Date.parse(value)), "Invalid instant"),
)

/** Strict, credential-free transport wrappers around the canonical message fields. */
export const organizerDashboardMessageInputSchemas = {
  messageList: v.strictObject(orgEvent),
  messageGet: v.strictObject(message),
  messageCreate: v.strictObject({ ...orgEvent, ...organizerDashboardMessageContentSchema.entries }),
  messageUpdate: v.strictObject({ ...message, ...organizerDashboardMessageContentSchema.entries }),
  messageSchedule: v.strictObject({ ...message, scheduledAt: isoInstant }),
  messageSend: v.strictObject(message),
  messageDelete: v.strictObject(message),
  messageIcsGet: v.strictObject(orgEvent),
  messageReminderGet: v.strictObject(orgEvent),
  messageReminderUpdate: v.strictObject({ ...orgEvent, ...organizerDashboardMessageReminderSchema.entries }),
} as const
