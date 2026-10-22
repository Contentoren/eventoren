import { describe, expect, test } from "bun:test"
import {
  authEmailAlternativeFromAddress,
  authEmailDefaultFromAddress,
  authEmailFromAddressRead,
  authEmailPaymentFromAddress,
} from "./authEmailFromAddress.ts"

describe("authEmailFromAddressRead", () => {
  test("defaults to kontakt when unset", () => {
    const result = authEmailFromAddressRead({})
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe("kontakt@eventoren.de")
    expect(authEmailDefaultFromAddress).toBe("kontakt@eventoren.de")
  })

  test("accepts explicit override", () => {
    const result = authEmailFromAddressRead({ AUTH_SMTP_FROM: "info@eventoren.de" })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe("info@eventoren.de")
  })

  test("rejects invalid sender fail-closed", () => {
    const result = authEmailFromAddressRead({ AUTH_SMTP_FROM: "not-an-email" })
    expect(result.success).toBe(false)
  })

  test("payment and alternative senders are documented constants", () => {
    expect(authEmailPaymentFromAddress).toBe("bestellung@eventoren.de")
    expect(authEmailAlternativeFromAddress).toBe("info@eventoren.de")
  })
})
