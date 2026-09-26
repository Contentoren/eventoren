import { lstat, readFile } from "node:fs/promises"
import { join } from "node:path"
import { createResult, createResultError } from "#result"
import * as v from "valibot"
import { e2eCheckpointSchema, type E2eCheckpoint } from "./e2eCheckpointSchema.ts"

/** Corrupt, foreign-owned and different-target state is never discarded or overwritten. */
export async function e2eCheckpointLoad(directory: string, target: Pick<E2eCheckpoint, "target" | "baseUrl">) {
  const op = "e2eCheckpointLoad"
  const path = join(directory, "checkpoint.json")
  try {
    const stat = await lstat(path)
    if (!stat.isFile() || stat.uid !== process.getuid?.() || (stat.mode & 0o077) !== 0) {
      return createResultError(op, "Checkpoint file is not private and user-owned")
    }
    const parsed = v.safeParse(e2eCheckpointSchema, JSON.parse(await readFile(path, "utf8")))
    if (!parsed.success) return createResultError(op, "Invalid E2E checkpoint; reconcile it manually")
    if (parsed.output.target !== target.target || parsed.output.baseUrl !== target.baseUrl) {
      return createResultError(op, "E2E checkpoint belongs to a different target; reconcile it manually")
    }
    return createResult(parsed.output as E2eCheckpoint | null)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return createResult(null as E2eCheckpoint | null)
    return createResultError(op, "Cannot safely read E2E checkpoint; no workflows started")
  }
}
