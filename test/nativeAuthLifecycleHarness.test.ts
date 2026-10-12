import { expect, test } from "bun:test"
import { nativeAuthLifecycleEventFind } from "../e2e/workflows/nativeAuth/nativeAuthLifecycleEventFind.ts"
import { nativeAuthLifecycleIdentityCreate } from "../e2e/workflows/nativeAuth/nativeAuthLifecycleIdentityCreate.ts"

test("resuming a lifecycle run reuses the same exact event key and marker", () => {
  const first = nativeAuthLifecycleIdentityCreate("mrun-12345678-1234-1234-1234-123456789abc")
  const second = nativeAuthLifecycleIdentityCreate("mrun-12345678-1234-1234-1234-123456789abc")

  expect(second).toEqual(first)
  expect(second.eventKey).toBe("native-auth-12345678-1234-1234-1234-123456789abc")
  expect(second.titleMarker).toBe(
    "[native-auth-e2e:mrun-12345678-1234-1234-1234-123456789abc:12345678-1234-1234-1234-123456789abc]",
  )
  expect(second.initialTitle).toBe(`${second.titleMarker} lifecycle draft`)
  expect(second.editedTitle).toBe(`${second.titleMarker} lifecycle edited`)
})

test("different lifecycle runs never share an event key or marker", () => {
  const first = nativeAuthLifecycleIdentityCreate("mrun-12345678-1234-1234-1234-123456789abc")
  const second = nativeAuthLifecycleIdentityCreate("mrun-87654321-4321-4321-4321-cba987654321")

  expect(second.eventKey).not.toBe(first.eventKey)
  expect(second.titleMarker).not.toBe(first.titleMarker)
  expect(second.titleMarker).toContain(second.eventKey.slice("native-auth-".length))
})

test("stable lifecycle identity keeps the exact key/title agreement the ownership proof recognizes", () => {
  const identity = nativeAuthLifecycleIdentityCreate("mrun-12345678-1234-1234-1234-123456789abc")
  const attemptId = identity.eventKey.slice("native-auth-".length)

  expect(attemptId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  expect(identity.titleMarker.endsWith(`:${attemptId}]`)).toBe(true)
})

test("owned-draft cleanup finds the exact admin projection id despite another draft having the same title", () => {
  const title = "[native-auth-e2e:resumed-run] lifecycle edited"
  const unrelated = { id: "native-auth-previous-attempt", title, status: "draft", eventRevision: 2 }
  const owned = { id: "native-auth-current-attempt", title, status: "draft", eventRevision: 2 }

  expect(nativeAuthLifecycleEventFind([unrelated, owned], owned.id)).toBe(owned)
  expect(nativeAuthLifecycleEventFind([unrelated], owned.id)).toBeUndefined()
  expect(nativeAuthLifecycleEventFind([], owned.id)).toBeUndefined()
})
