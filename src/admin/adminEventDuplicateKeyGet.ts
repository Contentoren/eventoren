import { createResult, type Result } from "#result"

/** Lifecycle response adapter: the duplicate mutation returns the fresh draft's eventKey. */
export function adminEventDuplicateKeyGet(result: Result<{ readonly eventKey: string }>): Result<string> {
  if (!result.success) return result
  return createResult(result.data.eventKey)
}
