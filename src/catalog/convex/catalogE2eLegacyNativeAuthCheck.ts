import { createResult, createResultError, type Result } from "#result"

const eventKeyPrefix = "native-auth-"
const attemptIdPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const titleDoublePattern =
  /^\[native-auth-e2e:([^:\[\]]+):([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\] lifecycle (draft|edited)$/
const titleSinglePattern = /^\[native-auth-e2e:([^:\[\]]+)\] lifecycle (draft|edited)$/
const sanitizedRunIdPattern = /^[a-zA-Z0-9-]{1,128}$/
const uuidInRunIdPattern = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/

// Known legacy production fixture (created 2026-10-06T09:41:42.486Z, archived
// 2026-10-06T09:58:44.065Z alongside the muwdpyqv run lineage): its event key was
// changed after creation, so the key attempt no longer agrees with the title's
// single-marker run. Archive logs and the historical run identify this exact
// key+title pair as the authorized fixture, so it is allowlisted exactly; any
// near-foreign key or title variation still refuses.
export const catalogE2eLegacyNativeAuthMismatchEventKey = "native-auth-a844f1f7-5c21-469f-bc8b-fe721ec05ec0"
export const catalogE2eLegacyNativeAuthMismatchTitle =
  "[native-auth-e2e:muwdpyqv-49622e87-f4ee-4cf8-a487-26c874d1283b] lifecycle edited"
const catalogE2eLegacyNativeAuthMismatchRunId = "muwdpyqv-49622e87-f4ee-4cf8-a487-26c874d1283b"

export type CatalogE2eLegacyNativeAuthOwnership = {
  attemptId: string
  runId: string
}

/**
 * Prove persistent E2E ownership of a native-auth lifecycle draft from its stored
 * markers alone, including already-archived rows. The current convention carries
 * the attempt UUID in the event key and the `[native-auth-e2e:runId:attemptId]`
 * title marker with both attempt IDs agreeing; the historical single-marker
 * convention carries the whole run in both (`native-auth-{runId}` with
 * `[native-auth-e2e:{runId}]`), corroborated by exact key/title agreement plus a
 * UUID inside the run. One exactly-known legacy row whose key was changed after
 * creation is authorized by its exact key+title pair. A key prefix or a generic
 * test title alone never establishes ownership.
 */
export function catalogE2eLegacyNativeAuthCheck(input: {
  eventKey: string
  title: string
}): Result<CatalogE2eLegacyNativeAuthOwnership> {
  const op = "catalogE2eLegacyNativeAuthCheck"
  if (
    input.eventKey === catalogE2eLegacyNativeAuthMismatchEventKey &&
    input.title === catalogE2eLegacyNativeAuthMismatchTitle
  )
    return createResult({
      attemptId: catalogE2eLegacyNativeAuthMismatchEventKey.slice(eventKeyPrefix.length).toLowerCase(),
      runId: catalogE2eLegacyNativeAuthMismatchRunId,
    })
  if (!input.eventKey.startsWith(eventKeyPrefix))
    return createResultError(op, "Event key is not a native-auth fixture marker")
  const keySuffix = input.eventKey.slice(eventKeyPrefix.length)
  const doubleMatch = titleDoublePattern.exec(input.title)
  if (doubleMatch?.[1] && doubleMatch?.[2]) {
    if (!attemptIdPattern.test(keySuffix)) return createResultError(op, "Native-auth attempt marker is invalid")
    if (doubleMatch[2].toLowerCase() !== keySuffix.toLowerCase())
      return createResultError(op, "Event key and title attempt markers disagree")
    return createResult({ attemptId: keySuffix, runId: doubleMatch[1] })
  }
  const singleMatch = titleSinglePattern.exec(input.title)
  if (singleMatch?.[1]) {
    const runId = singleMatch[1]
    if (!sanitizedRunIdPattern.test(runId) || !uuidInRunIdPattern.test(runId))
      return createResultError(op, "Title does not carry the exact native-auth run marker")
    if (keySuffix !== runId) return createResultError(op, "Event key and title attempt markers disagree")
    return createResult({ attemptId: keySuffix, runId })
  }
  return createResultError(op, "Title does not carry the exact native-auth run marker")
}
