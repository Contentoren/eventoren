import * as v from "valibot"

/**
 * Durable delivery state of an invitation mail.
 * `queued` = waiting for the sender, `sending` = claimed by one attempt,
 * `sent` = handed over to the mail provider, `failed` = provider error,
 * `skipped` = no provider available (never a delivered mail).
 */
export const organizerDashboardTeamDeliveryStateSchema = v.picklist(["queued", "sending", "sent", "failed", "skipped"])

export type OrganizerDashboardTeamDeliveryState = v.InferOutput<typeof organizerDashboardTeamDeliveryStateSchema>
