import { expect, test } from "bun:test"
import { createResult, createResultError } from "#result"
import { adminEventDuplicateKeyGet } from "./adminEventDuplicateKeyGet.ts"

test("duplicate navigation uses the backend's fresh eventKey, not the source or revision", () => {
  const response = createResult({ eventKey: "fresh-draft", catalogVersion: 7, eventRevision: 1 })
  expect(adminEventDuplicateKeyGet(response)).toEqual(createResult("fresh-draft"))
})

test("duplicate failure is preserved for the overview action error", () => {
  const failure = createResultError("catalogEventDuplicateMutation", "Event not found")
  expect(adminEventDuplicateKeyGet(failure)).toBe(failure)
})
