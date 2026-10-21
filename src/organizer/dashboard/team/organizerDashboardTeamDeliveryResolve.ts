import type { Result } from "#result"

/** Sender that hands the invitation mail over to the mail provider. */
export type OrganizerDashboardTeamEmailSender = () => Promise<Result<null>>

export type OrganizerDashboardTeamDeliveryOutcome =
  | { readonly state: "sent" }
  | { readonly state: "skipped"; readonly reason: string }
  | { readonly state: "failed"; readonly reason: string }

/**
 * Delivery decision of one invitation mail.
 *
 * The sender is injected, so tests can use a fake provider. `null` means that
 * no provider is available: the outcome is `skipped` and never `sent`, because
 * a mail that was not handed over to a provider was not delivered.
 */
export async function organizerDashboardTeamDeliveryResolve(inputs: {
  readonly sender: OrganizerDashboardTeamEmailSender | null
  readonly skippedReason: string
}): Promise<OrganizerDashboardTeamDeliveryOutcome> {
  if (inputs.sender === null) return { state: "skipped", reason: inputs.skippedReason }
  const result = await inputs.sender()
  if (!result.success) return { state: "failed", reason: result.errorMessage }
  return { state: "sent" }
}
