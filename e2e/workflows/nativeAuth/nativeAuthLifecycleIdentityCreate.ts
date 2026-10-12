const uuidSuffixPattern = /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/u

function attemptDerive(runId: string): string {
  const suffix = uuidSuffixPattern.exec(runId)?.[1]
  if (suffix) return suffix.toLowerCase()
  let first = 0x811c9dc5
  let second = 0x01000193
  for (const unit of runId) {
    const code = unit.codePointAt(0) ?? 0
    first = Math.imul(first ^ code, 0x01000193) >>> 0
    second = Math.imul(second ^ (code + 0x9e3779b9), 0x85ebca6b) >>> 0
  }
  const hex = (value: number): string => value.toString(16).padStart(8, "0")
  const third = Math.imul(first ^ second, 0xc2b2ae35) >>> 0
  const fourth = Math.imul(second ^ third, 0x27d4eb2f) >>> 0
  const raw = `${hex(first)}${hex(second)}${hex(third)}${hex(fourth)}`
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20, 32)}`
}

/**
 * Same-run stable identity: one runId always maps to one exact event key and
 * title marker, so a repaired resume reconciles the existing draft instead of
 * creating a replacement. The attempt UUID is the runId's own UUID suffix when
 * present, keeping the exact key/title agreement the historical ownership
 * proof recognizes; otherwise it is a deterministic hash of the runId.
 */
export function nativeAuthLifecycleIdentityCreate(runId: string) {
  const sanitizedRunId = runId.replaceAll(/[^a-zA-Z0-9-]/g, "-")
  const attemptId = attemptDerive(runId)
  const eventKey = `native-auth-${attemptId}`
  const titleMarker = `[native-auth-e2e:${sanitizedRunId}:${attemptId}]`
  return {
    eventKey,
    titleMarker,
    initialTitle: `${titleMarker} lifecycle draft`,
    editedTitle: `${titleMarker} lifecycle edited`,
  }
}
