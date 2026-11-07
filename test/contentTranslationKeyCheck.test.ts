import { expect, test } from "bun:test"
import { contentTranslationKeyCheck } from "../src/app/content/contentTranslationKeyCheck.ts"

test("a key used once in each collection is valid", () => {
  expect(
    contentTranslationKeyCheck([
      { collection: "ratgeber", file: "de.md", translationKey: "gdpr" },
      { collection: "guides", file: "en.md", translationKey: "gdpr" },
    ]),
  ).toEqual([])
})

test("a missing counterpart is only a warning while the other collection is empty", () => {
  const issues = contentTranslationKeyCheck([{ collection: "ratgeber", file: "de.md", translationKey: "gdpr" }])
  expect(issues.map((issue) => issue.level)).toEqual(["warning"])
})

test("a missing counterpart or a duplicate key is an error once both collections have articles", () => {
  const issues = contentTranslationKeyCheck([
    { collection: "ratgeber", file: "a.md", translationKey: "gdpr" },
    { collection: "ratgeber", file: "b.md", translationKey: "gdpr" },
    { collection: "guides", file: "c.md", translationKey: null },
  ])
  expect(issues.map((issue) => issue.level)).toEqual(["error", "error"])
})
