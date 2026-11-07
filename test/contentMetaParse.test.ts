import { expect, test } from "bun:test"
import { contentMetaParse } from "../src/app/content/contentMetaParse.ts"

test("reads the extended frontmatter keys and defaults the optional ones", () => {
  const result = contentMetaParse({ title: "x", category: " abiball ", keywords: ["a", "b"] })
  expect(result).toEqual({
    success: true,
    data: { category: "abiball", keywords: ["a", "b"], translationKey: null, seoTitle: null },
  })
})

test("keeps translationKey and seoTitle when present", () => {
  const result = contentMetaParse({ category: "law-tax", keywords: [], translationKey: "gdpr", seoTitle: "GDPR" })
  expect(result.success && result.data.translationKey).toBe("gdpr")
  expect(result.success && result.data.seoTitle).toBe("GDPR")
})

test("fails with a Result error when category is missing", () => {
  const result = contentMetaParse({ keywords: ["a"] })
  expect(result.success).toBe(false)
  expect(!result.success && result.op).toBe("contentMetaParse")
})
