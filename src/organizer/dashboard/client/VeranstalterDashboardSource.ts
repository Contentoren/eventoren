import type { Result } from "#result"
import type { VeranstalterDashboardContext } from "./veranstalterDashboardContextSchema.ts"

/**
 * Injectable live source for the Veranstalter dashboard shell.
 * The concrete Convex query bridge (api.organizerDashboard.organizerDashboardContextQuery)
 * is wired once the foundation agent's backend contract lands — view state consumes
 * only this interface via reactive accessors, never a fabricated api reference.
 */
export interface VeranstalterDashboardSource {
  readonly contextResult: () => Result<VeranstalterDashboardContext> | undefined
}
