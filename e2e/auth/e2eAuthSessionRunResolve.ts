import { createResult, createResultError } from "#result"

/** Resolve the actual outer-runner E2E run marker. Never invent a replacement run. */
export function e2eAuthSessionRunResolve(environment: Record<string, string | undefined>) {
  const op = "e2eAuthSessionRunResolve"
  const runId = environment.E2E_RUN_ID?.trim()
  if (!runId) return createResultError(op, "E2E_RUN_ID is not set")
  if (!/^[0-9a-z]+-[0-9a-f-]{36}$/u.test(runId)) return createResultError(op, "E2E_RUN_ID is not a valid run marker")
  return createResult(runId)
}
