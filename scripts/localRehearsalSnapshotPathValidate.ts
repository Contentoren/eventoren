import * as a from "valibot"
import { createResult, createResultError, type Result } from "#result"

const localRehearsalSnapshotPathInputSchema = a.object({
  snapshotPath: a.pipe(a.string(), a.minLength(1, "Snapshot path is required")),
  stateRoot: a.pipe(a.string(), a.minLength(1, "State root is required")),
})

export function localRehearsalSnapshotPathValidate(input: {
  snapshotPath: string
  stateRoot: string
}): Result<{ snapshotPath: string }> {
  const op = "localRehearsalSnapshotPathValidate"
  const parsed = a.safeParse(localRehearsalSnapshotPathInputSchema, {
    snapshotPath: input.snapshotPath,
    stateRoot: input.stateRoot,
  })
  if (!parsed.success) return createResultError(op, a.summarize(parsed.issues))
  const normalizedRoot = parsed.output.stateRoot.endsWith("/")
    ? parsed.output.stateRoot.slice(0, -1)
    : parsed.output.stateRoot
  const candidate = parsed.output.snapshotPath
  if (!candidate.startsWith(`${normalizedRoot}/`))
    return createResultError(op, "Snapshot path must stay under the private rehearsal state root")
  const remainder = candidate.slice(normalizedRoot.length + 1)
  if (remainder === "" || remainder.includes("..") || candidate.includes("//"))
    return createResultError(op, "Snapshot path must not traverse outside the private rehearsal state root")
  return createResult({ snapshotPath: candidate })
}
