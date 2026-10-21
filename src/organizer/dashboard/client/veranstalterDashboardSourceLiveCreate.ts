import * as v from "valibot"
import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type Result } from "#result"
import { queryCreate } from "#src/utils/convex_client/queryCreate.ts"
import type { VeranstalterDashboardSource } from "./VeranstalterDashboardSource.ts"
import type { VeranstalterDashboardContext } from "./veranstalterDashboardContextSchema.ts"
import { veranstalterDashboardContextSchema } from "./veranstalterDashboardContextSchema.ts"

/**
 * Live Convex bridge for the Veranstalter dashboard shell.
 * Token is injected by queryCreate from EventorenAuthProvider — never HTTP or localStorage.
 */
export function veranstalterDashboardSourceLiveCreate(inputs: {
  readonly orgId: () => string | undefined
}): VeranstalterDashboardSource {
  const op = "veranstalterDashboardSourceLiveCreate"
  const raw = queryCreate(api.organizerDashboard.organizerDashboardContextQuery, () =>
    inputs.orgId() ? { orgId: inputs.orgId() as Id<"orgs"> } : {},
  )
  const contextResult = (): Result<VeranstalterDashboardContext> | undefined => {
    const current = raw()
    if (!current) return undefined
    if (!current.success) return createResultError(current.op ?? op, current.errorMessage)
    const parsed = v.safeParse(veranstalterDashboardContextSchema, current.data)
    if (!parsed.success) return createResultError(op, v.summarize(parsed.issues))
    return createResult(parsed.output)
  }
  return { contextResult }
}
