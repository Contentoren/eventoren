import * as v from "valibot"
import { describe, expect, test } from "bun:test"

import { dashRefundSchema } from "./dashRefundSchema.ts"

describe("dashRefundSchema", () => {
  test("feeCents ist optional und fällt auf 0 zurück", () => {
    const parsed = v.safeParse(dashRefundSchema, {
      id: "refund-1",
      amountCents: 2450,
      reason: "Storno",
      at: "2026-10-10T10:00:00.000Z",
      ticketIds: ["t-1"],
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.output.feeCents).toBe(0)
  })

  test("feeCents lässt sich setzen", () => {
    const parsed = v.safeParse(dashRefundSchema, {
      id: "refund-1",
      amountCents: 2450,
      feeCents: 172,
      reason: "Storno",
      at: "2026-10-10T10:00:00.000Z",
      ticketIds: ["t-1"],
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.output.feeCents).toBe(172)
  })
})
