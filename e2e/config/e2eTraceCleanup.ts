import { lstat, readdir, rmdir, unlink } from "node:fs/promises"
import { join } from "node:path"

const maxAge = 24 * 60 * 60_000

/** Remove only fully expired direct-child RSTest Playwright trace artifacts. */
export async function e2eTraceCleanup(input: { directory?: string; now?: number } = {}): Promise<{
  success: boolean
  errorMessage?: string
  removed?: string[]
}> {
  const op = "e2eTraceCleanup"
  const rstestRoot = join(input.directory ?? process.cwd(), ".rstest")
  const traceRoot = join(rstestRoot, "playwright-traces")
  const now = input.now ?? Date.now()
  let entries: string[]
  try {
    const parent = await lstat(rstestRoot)
    if (parent.isSymbolicLink() || !parent.isDirectory())
      return { success: false, errorMessage: `${op}: .rstest is not a regular directory; traces retained` }
    const rootDetails = await lstat(traceRoot)
    if (rootDetails.isSymbolicLink() || !rootDetails.isDirectory())
      return { success: false, errorMessage: `${op}: trace root is not a regular directory; traces retained` }
    entries = await readdir(traceRoot)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { success: true, removed: [] }
    return { success: false, errorMessage: `${op}: unable to read trace directory: ${String(error)}` }
  }

  const removed: string[] = []
  for (const entry of entries) {
    const path = join(traceRoot, entry)
    try {
      const details = await lstat(path)
      if (!details.isDirectory() || details.isSymbolicLink()) continue
      const expired = await e2eTraceTreeExpired(path, now)
      if (!expired) continue
      // A new trace may appear after inspection; never recursively delete the checked tree.
      if (await e2eTraceTreeRemoveExpired(path, now)) removed.push(entry)
    } catch (error) {
      return { success: false, errorMessage: `${op}: unable to safely sweep ${entry}: ${String(error)}`, removed }
    }
  }
  return { success: true, removed }
}

async function e2eTraceTreeRemoveExpired(directory: string, now: number): Promise<boolean> {
  const details = await lstat(directory)
  if (details.isSymbolicLink() || now - details.mtimeMs <= maxAge) return false
  if (details.isFile()) {
    await unlink(directory)
    return true
  }
  if (!details.isDirectory() || !(await e2eTraceTreeExpired(directory, now))) return false
  for (const entry of await readdir(directory)) {
    await e2eTraceTreeRemoveExpired(join(directory, entry), now)
  }
  try {
    await rmdir(directory)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOTEMPTY") return false
    throw error
  }
}

async function e2eTraceTreeExpired(directory: string, now: number): Promise<boolean> {
  const details = await lstat(directory)
  if (details.isSymbolicLink() || !details.isDirectory() || now - details.mtimeMs <= maxAge) return false
  const entries = await readdir(directory)
  for (const entry of entries) {
    const path = join(directory, entry)
    const child = await lstat(path)
    if (child.isSymbolicLink() || now - child.mtimeMs <= maxAge) return false
    if (child.isDirectory() && !(await e2eTraceTreeExpired(path, now))) return false
    if (!child.isDirectory() && !child.isFile()) return false
  }
  return true
}
