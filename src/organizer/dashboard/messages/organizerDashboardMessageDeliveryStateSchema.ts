import * as v from "valibot"

/**
 * Durable transport state of one message. Same honest pattern as the team
 * invitation delivery: `queued` waits for the sender, `sending` is claimed by
 * one attempt, `sent` means handed over to a mail provider, `failed` is a
 * provider error, `skipped` means no provider was available — never a sent
 * mail. No simulated sends, no fake success.
 */
export const organizerDashboardMessageDeliveryStateSchema = v.picklist([
  "queued",
  "sending",
  "sent",
  "failed",
  "skipped",
])

export type OrganizerDashboardMessageDeliveryState = v.InferOutput<typeof organizerDashboardMessageDeliveryStateSchema>
