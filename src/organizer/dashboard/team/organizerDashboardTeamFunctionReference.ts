import { makeFunctionReference } from "convex/server"
import type { RegisteredAction, RegisteredMutation, RegisteredQuery } from "convex/server"
import type { OrganizerDashboardTeamFunctionReference } from "#src/organizer/dashboard/team/organizerDashboardTeamFunctionReferenceType.ts"

/**
 * Typed reference to a team Convex function by its canonical name.
 *
 * The generated `api`/`internal` objects only contain modules that existed
 * during the last codegen run. Team functions are referenced by name so that
 * the client, the scheduler and internal calls work before and after the
 * generated api is refreshed with the team module.
 */
export function organizerDashboardTeamFunctionReference<
  Export extends RegisteredQuery<any, any, any> | RegisteredMutation<any, any, any> | RegisteredAction<any, any, any>,
>(name: string): OrganizerDashboardTeamFunctionReference<Export> {
  return makeFunctionReference(name) as OrganizerDashboardTeamFunctionReference<Export>
}
