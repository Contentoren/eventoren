import { describe, expect, test } from "bun:test"
import { adminActivationCodeCountParse } from "../src/admin/adminActivationCodeCountParse.ts"
import { adminEventDetailSearchParse } from "../src/admin/adminEventDetailSearchParse.ts"

describe("admin activation code count parsing", () => {
  test("accepts counts within the generation bound", () => {
    expect(adminActivationCodeCountParse("1")).toBe(1)
    expect(adminActivationCodeCountParse("50")).toBe(50)
    expect(adminActivationCodeCountParse("500")).toBe(500)
    expect(adminActivationCodeCountParse("  20  ")).toBe(20)
  })

  test("rejects missing, non-numeric and out-of-range counts", () => {
    for (const input of ["", "   ", "0", "501", "1000", "-3", "1.5", "abc", "10 Codes", "５０"]) {
      expect(adminActivationCodeCountParse(input)).toBeNull()
    }
  })
})

describe("admin event detail search parsing", () => {
  test("keeps the activation code tab while defaulting everything else to details", () => {
    expect(adminEventDetailSearchParse({ tab: "codes" })).toEqual({ tab: "codes" })
    expect(adminEventDetailSearchParse({ tab: "products" })).toEqual({ tab: "products" })
    expect(adminEventDetailSearchParse({})).toEqual({})
    expect(adminEventDetailSearchParse({ tab: "orders" })).toEqual({})
    expect(adminEventDetailSearchParse({ tab: "" })).toEqual({})
  })
})
