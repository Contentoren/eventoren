import { describe, expect, it } from "@rstest/core"
import { e2eEnvironmentRead } from "./e2eEnvironmentRead.ts"
import { e2eTicketTargetCheck } from "./e2eTicketTargetCheck.ts"

describe("E2E target protection", () => {
  it("defaults to the production origin, not preview", () => {
    const result = e2eEnvironmentRead({})
    expect(result.success && result.data.baseUrl).toBe("https://eventoren.de")
    expect(result.success && result.data.target).toBe("production")
  })

  it("selects preview only with an explicit development target", () => {
    const result = e2eEnvironmentRead({ E2E_TARGET: "development" })
    expect(result.success && result.data.baseUrl).toBe("https://eventoren.leonardomora.de")
  })

  it("rejects cross-target, credential-bearing and noncanonical URLs", () => {
    for (const environment of [
      { E2E_BASE_URL: "https://eventoren.leonardomora.de" },
      { E2E_TARGET: "development", E2E_BASE_URL: "https://eventoren.de" },
      { E2E_TARGET: "development", E2E_BASE_URL: "http://eventoren.leonardomora.de" },
      { E2E_BASE_URL: "https://user:secret@eventoren.de" },
      { E2E_BASE_URL: "https://eventoren.de/admin" },
      { E2E_TARGET: "preview" },
    ]) {
      expect(e2eEnvironmentRead(environment).success).toBe(false)
    }
  })

  it("fails closed for production ticket purchases but allows preview test sessions", () => {
    expect(e2eTicketTargetCheck("production").success).toBe(false)
    expect(e2eTicketTargetCheck("development").success).toBe(true)
  })
})
