import { makeFunctionReference } from "convex/server"
import type { RegisteredAction, RegisteredMutation, RegisteredQuery } from "convex/server"
import type { OrganizerDashboardGuestFunctionReference } from "#src/organizer/dashboard/guests/organizerDashboardGuestFunctionReferenceType.ts"

/**
 * Typed reference to a guest Convex function by its canonical name.
 * Same reason as the team references: the generated `api` object only
 * contains modules that existed during the last codegen run.
 */
export function organizerDashboardGuestFunctionReference<
  Export extends RegisteredQuery<any, any, any> | RegisteredMutation<any, any, any> | RegisteredAction<any, any, any>,
>(name: string): OrganizerDashboardGuestFunctionReference<Export> {
  return makeFunctionReference(name) as OrganizerDashboardGuestFunctionReference<Export>
}
