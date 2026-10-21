import { makeFunctionReference } from "convex/server"
import type { RegisteredAction, RegisteredMutation, RegisteredQuery } from "convex/server"
import type { OrganizerDashboardMessageFunctionReference } from "#src/organizer/dashboard/messages/organizerDashboardMessageFunctionReferenceType.ts"

/**
 * Typed reference to a message Convex function by its canonical name.
 * Same reason as the team references: the generated `api` object only
 * contains modules that existed during the last codegen run.
 */
export function organizerDashboardMessageFunctionReference<
  Export extends RegisteredQuery<any, any, any> | RegisteredMutation<any, any, any> | RegisteredAction<any, any, any>,
>(name: string): OrganizerDashboardMessageFunctionReference<Export> {
  return makeFunctionReference(name) as OrganizerDashboardMessageFunctionReference<Export>
}
