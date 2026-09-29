import { describe, expect, it } from "@rstest/core"
import { browserErrorsAssert } from "./browserErrorsAssert.ts"

describe("browser error guard", () => {
  it("fails the empty-errors assertion for a synthetic SSO page error", () => {
    expect(() => browserErrorsAssert(["Error: synthetic SSO page error"])).toThrow()
  })
})
