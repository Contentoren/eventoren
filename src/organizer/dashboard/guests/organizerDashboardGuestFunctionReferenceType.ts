import type { FunctionReference, RegisteredAction, RegisteredMutation, RegisteredQuery } from "convex/server"

type OrganizerDashboardGuestUnwrapPromise<T> = T extends Promise<infer Value> ? Value : T

/** Typed Convex function reference derived from a registered function export. */
export type OrganizerDashboardGuestFunctionReference<Export> =
  Export extends RegisteredQuery<infer Visibility, infer Args, infer Return>
    ? FunctionReference<"query", Visibility, Args, OrganizerDashboardGuestUnwrapPromise<Return>>
    : Export extends RegisteredMutation<infer Visibility, infer Args, infer Return>
      ? FunctionReference<"mutation", Visibility, Args, OrganizerDashboardGuestUnwrapPromise<Return>>
      : Export extends RegisteredAction<infer Visibility, infer Args, infer Return>
        ? FunctionReference<"action", Visibility, Args, OrganizerDashboardGuestUnwrapPromise<Return>>
        : never
