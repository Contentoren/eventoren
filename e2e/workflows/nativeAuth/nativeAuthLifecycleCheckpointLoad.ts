import { lstat, readFile } from "node:fs/promises"
import { createResult, createResultError } from "#result"
import * as v from "valibot"
import { nativeAuthLifecycleCheckpointPath } from "./nativeAuthLifecycleCheckpointPath.ts"
import {
  nativeAuthLifecycleCheckpointSchema,
  type NativeAuthLifecycleCheckpoint,
} from "./nativeAuthLifecycleCheckpointSchema.ts"

/** Corrupt and different-target lifecycle state is never discarded or overwritten. */
export async function nativeAuthLifecycleCheckpointLoad(
  directory: string,
  target: Pick<NativeAuthLifecycleCheckpoint, "target" | "baseUrl">,
) {
  const op = "nativeAuthLifecycleCheckpointLoad"
  const path = nativeAuthLifecycleCheckpointPath(directory)
  try {
    const stat = await lstat(path)
    if (!stat.isFile() || stat.uid !== process.getuid?.() || (stat.mode & 0o077) !== 0) {
      return createResultError(op, "Lifecycle checkpoint file is not private and user-owned")
    }
    const parsed = v.safeParse(nativeAuthLifecycleCheckpointSchema, JSON.parse(await readFile(path, "utf8")))
    if (!parsed.success) return createResultError(op, "Invalid lifecycle checkpoint; reconcile it manually")
    if (parsed.output.target !== target.target || parsed.output.baseUrl !== target.baseUrl) {
      return createResultError(op, "Lifecycle checkpoint belongs to a different target; reconcile it manually")
    }
    return createResult(parsed.output as NativeAuthLifecycleCheckpoint | null)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createResult(null as NativeAuthLifecycleCheckpoint | null)
    }
    return createResultError(op, "Cannot safely read lifecycle checkpoint; no fixture created")
  }
}
