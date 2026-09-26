import { unlink } from "node:fs/promises"
import { join } from "node:path"
import { createResult, createResultError } from "#result"
import { e2eCheckpointLoad } from "./e2eCheckpointLoad.ts"
import type { E2eCheckpoint } from "./e2eCheckpointSchema.ts"

/** Discard only an expired, read-only SSO attempt; never discard uncertain ticket effects. */
export async function e2eCheckpointSsoClear(directory: string, checkpoint: E2eCheckpoint) {
  const op = "e2eCheckpointSsoClear"
  const current = await e2eCheckpointLoad(directory, checkpoint)
  if (!current.success) return current
  if (
    !current.data ||
    current.data.phase !== "sso" ||
    current.data.runId !== checkpoint.runId ||
    current.data.createdAt !== checkpoint.createdAt
  ) {
    return createResultError(op, "Cannot clear an absent or unreconciled E2E checkpoint")
  }
  try {
    await unlink(join(directory, "checkpoint.json"))
    return createResult(true)
  } catch {
    return createResultError(op, "Unable to clear expired SSO checkpoint")
  }
}
