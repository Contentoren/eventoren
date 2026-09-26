import { open, rename, rm } from "node:fs/promises"
import { join } from "node:path"
import { createResult, createResultError } from "#result"
import * as v from "valibot"
import { e2eCheckpointLoad } from "./e2eCheckpointLoad.ts"
import { e2eCheckpointSchema, type E2eCheckpoint } from "./e2eCheckpointSchema.ts"

export async function e2eCheckpointSave(directory: string, checkpoint: E2eCheckpoint) {
  const op = "e2eCheckpointSave"
  if (!v.safeParse(e2eCheckpointSchema, checkpoint).success) {
    return createResultError(op, "Invalid E2E checkpoint; no workflows started")
  }
  const existing = await e2eCheckpointLoad(directory, checkpoint)
  if (!existing.success) return existing
  if (
    existing.data &&
    (existing.data.runId !== checkpoint.runId ||
      existing.data.createdAt !== checkpoint.createdAt ||
      (existing.data.phase === "ticket-unreconciled" && checkpoint.phase !== "ticket-unreconciled"))
  ) {
    return createResultError(op, "Cannot overwrite another run or an unreconciled ticket attempt")
  }
  const path = join(directory, "checkpoint.json")
  const temp = join(directory, `.${crypto.randomUUID()}.tmp`)
  try {
    const file = await open(temp, "wx", 0o600)
    try {
      await file.writeFile(JSON.stringify(checkpoint))
      await file.sync()
    } finally {
      await file.close()
    }
    await rename(temp, path)
    return createResult(true)
  } catch {
    return createResultError(op, "Unable to persist E2E checkpoint; no further workflows started")
  } finally {
    await rm(temp, { force: true }).catch(() => {})
  }
}
