import { expect, test } from "bun:test"
import { adminEventDetailSearchParse } from "../src/admin/adminEventDetailSearchParse.ts"

test("release settings have their own URL tab and invalid tabs return to details", () => {
  expect(adminEventDetailSearchParse({ tab: "release" })).toEqual({ tab: "release" })
  expect(adminEventDetailSearchParse({ tab: "codes" })).toEqual({ tab: "codes" })
  expect(adminEventDetailSearchParse({ tab: "products" })).toEqual({ tab: "products" })
  expect(adminEventDetailSearchParse({ tab: "unknown" })).toEqual({})
  expect(adminEventDetailSearchParse({ tab: ["release"] })).toEqual({})
})
