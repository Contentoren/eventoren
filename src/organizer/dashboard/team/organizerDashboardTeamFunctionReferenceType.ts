import type { FunctionReference, RegisteredAction, RegisteredMutation, RegisteredQuery } from "convex/server"

type OrganizerDashboardTeamUnwrapPromise<T> = T extends Promise<infer Value> ? Value : T

/** Typed Convex function reference derived from a registered function export. */
export type OrganizerDashboardTeamFunctionReference<Export> =
  Export extends RegisteredQuery<infer Visibility, infer Args, infer Return>
    ? FunctionReference<"query", Visibility, Args, OrganizerDashboardTeamUnwrapPromise<Return>>
    : Export extends RegisteredMutation<infer Visibility, infer Args, infer Return>
      ? FunctionReference<"mutation", Visibility, Args, OrganizerDashboardTeamUnwrapPromise<Return>>
      : Export extends RegisteredAction<infer Visibility, infer Args, infer Return>
        ? FunctionReference<"action", Visibility, Args, OrganizerDashboardTeamUnwrapPromise<Return>>
        : never
