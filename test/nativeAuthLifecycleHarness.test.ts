import { expect, test } from "bun:test"
import { nativeAuthLifecycleEventFind } from "../e2e/workflows/nativeAuth/nativeAuthLifecycleEventFind.ts"
import { nativeAuthLifecycleIdentityCreate } from "../e2e/workflows/nativeAuth/nativeAuthLifecycleIdentityCreate.ts"

test("resuming a lifecycle run cannot reuse another attempt's draft or edited title", () => {
  const first = nativeAuthLifecycleIdentityCreate("resumed-run")
  const second = nativeAuthLifecycleIdentityCreate("resumed-run")

  expect(second.eventKey).not.toBe(first.eventKey)
  expect(second.initialTitle).not.toBe(first.initialTitle)
  expect(second.editedTitle).not.toBe(first.editedTitle)
  expect(second.editedTitle.startsWith(first.titleMarker)).toBe(false)
  expect(second.titleMarker).toContain(second.eventKey.slice("native-auth-".length))
})

test("owned-draft cleanup finds the exact admin projection id despite another draft having the same title", () => {
  const title = "[native-auth-e2e:resumed-run] lifecycle edited"
  const unrelated = { id: "native-auth-previous-attempt", title, status: "draft", eventRevision: 2 }
  const owned = { id: "native-auth-current-attempt", title, status: "draft", eventRevision: 2 }

  expect(nativeAuthLifecycleEventFind([unrelated, owned], owned.id)).toBe(owned)
  expect(nativeAuthLifecycleEventFind([unrelated], owned.id)).toBeUndefined()
  expect(nativeAuthLifecycleEventFind([], owned.id)).toBeUndefined()
})
