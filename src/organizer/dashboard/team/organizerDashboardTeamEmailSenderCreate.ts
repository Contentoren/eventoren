import type { Result } from "#result"
import { envEnvModeResult } from "#src/app/env/public/envEnvModeResult.ts"
import type { OrganizerDashboardTeamEmailSender } from "#src/organizer/dashboard/team/organizerDashboardTeamDeliveryResolve.ts"
import { envMode } from "#ui/env/envMode.ts"

/**
 * Real sender of the invitation mail.
 *
 * Outside production there is no mail provider, so no sender is returned and
 * the delivery ends as `skipped` instead of claiming a delivery that never
 * happened. Inside production the injected sender hands the mail over to the
 * existing mail provider action.
 */
export function organizerDashboardTeamEmailSenderCreate(inputs: { readonly send: () => Promise<Result<null>> }): {
  readonly sender: OrganizerDashboardTeamEmailSender | null
  readonly skippedReason: string
} {
  const env = envEnvModeResult()
  if (!env.success) return { sender: null, skippedReason: "The environment mode is not configured" }
  if (env.data !== envMode.production) {
    return { sender: null, skippedReason: "Mail delivery is disabled outside production" }
  }
  return { sender: inputs.send, skippedReason: "Mail delivery is disabled outside production" }
}
