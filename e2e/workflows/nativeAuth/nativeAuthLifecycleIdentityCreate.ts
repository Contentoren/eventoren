export function nativeAuthLifecycleIdentityCreate(runId: string) {
  const attemptId = crypto.randomUUID()
  const eventKey = `native-auth-${attemptId}`
  const titleMarker = `[native-auth-e2e:${runId.replaceAll(/[^a-zA-Z0-9-]/g, "-")}:${attemptId}]`
  return {
    eventKey,
    titleMarker,
    initialTitle: `${titleMarker} lifecycle draft`,
    editedTitle: `${titleMarker} lifecycle edited`,
  }
}
