import { createResult, createResultError, type PromiseResult } from "#result"

const op = "organizerDashboardEventInstantNormalize"

export async function organizerDashboardEventInstantNormalize(input: string): PromiseResult<string> {
  const time = Date.parse(input)
  if (Number.isNaN(time)) return createResultError(op, "Date must be a valid ISO date and time")
  return createResult(new Date(time).toISOString())
}
