import { describe, expect, test } from "bun:test"
import { organizerDashboardCodeGenerate } from "./organizerDashboardCodeGenerate.ts"
import { organizerDashboardCodeNormalize } from "./organizerDashboardCodeNormalize.ts"
import { organizerDashboardCodeValidate } from "./organizerDashboardCodeValidate.ts"

describe("organizerDashboardCodeNormalize", () => {
  test("uppercases and strips unsupported characters", () => {
    expect(organizerDashboardCodeNormalize("jazz 10!")).toBe("JAZZ10")
    expect(organizerDashboardCodeNormalize("abi-12a")).toBe("ABI-12A")
  })
})

describe("organizerDashboardCodeGenerate", () => {
  test("creates unique prefixed codes without ambiguous characters", () => {
    let seed = 42
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }
    const codes = organizerDashboardCodeGenerate({ prefix: "ABI-", count: 50, existing: ["ABI-AAAAAA"], random })
    expect(codes).toHaveLength(50)
    expect(new Set(codes).size).toBe(50)
    for (const code of codes) {
      expect(code).toMatch(/^ABI-[A-Z0-9-]{6}$/)
      const body = code.slice("ABI-".length)
      expect(body).not.toContain("I")
      expect(body).not.toContain("O")
      expect(body).not.toContain("0")
      expect(body).not.toContain("1")
    }
  })
})

describe("organizerDashboardCodeValidate", () => {
  test("unlocks only the requested hidden tiers of an access code", () => {
    const validated = organizerDashboardCodeValidate({
      kind: "zugang",
      tierKeys: ["schueler", "lehrer"],
      maxTickets: 60,
      usedTickets: 3,
      active: true,
      validFrom: null,
      validUntil: null,
      requestedTierKeys: ["schueler", "gaeste"],
      nowIso: "2026-10-15T10:00:00.000Z",
    })
    expect(validated.success).toBe(true)
    if (!validated.success) return
    expect(validated.data).toEqual({ unlockedTierKeys: ["schueler"] })
  })

  test("refuses access codes without tier binding or without overlap", () => {
    expect(
      organizerDashboardCodeValidate({
        kind: "zugang",
        tierKeys: [],
        maxTickets: null,
        usedTickets: 0,
        active: true,
        validFrom: null,
        validUntil: null,
        requestedTierKeys: ["schueler"],
        nowIso: "2026-10-15T10:00:00.000Z",
      }).success,
    ).toBe(false)
    expect(
      organizerDashboardCodeValidate({
        kind: "zugang",
        tierKeys: ["schueler"],
        maxTickets: null,
        usedTickets: 0,
        active: true,
        validFrom: null,
        validUntil: null,
        requestedTierKeys: ["gaeste"],
        nowIso: "2026-10-15T10:00:00.000Z",
      }).success,
    ).toBe(false)
  })
})
