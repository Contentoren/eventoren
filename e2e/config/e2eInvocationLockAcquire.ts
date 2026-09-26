import { open } from "node:fs/promises"
import { join } from "node:path"
import { createResult, createResultError } from "#result"

/** Covers checkpoint load/save and both child workflows, not just the ticket browser. */
export async function e2eInvocationLockAcquire(directory: string) {
  const op = "e2eInvocationLockAcquire"
  try {
    const lock = await open(join(directory, "invocation.lock"), "wx", 0o600)
    try {
      await lock.writeFile(String(process.pid))
      await lock.sync()
      return createResult(lock)
    } catch {
      await lock.close()
      return createResultError(op, "Unable to persist invocation lock; reconcile it manually")
    }
  } catch {
    return createResultError(op, "Another or interrupted E2E invocation holds the lock; reconcile it manually")
  }
}
