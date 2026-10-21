import { describe, expect, test } from "bun:test"
import { veranstalterEinstellungenInputValidate } from "./veranstalterEinstellungenInputValidate.ts"

const validIban = "DE89370400440532013000"

function validRaw() {
  return {
    orgId: "org_123",
    name: "Kulturhaus Lindenhof",
    kind: "verein",
    contactEmail: "hallo@example.org",
    contactPhone: "",
    imprint: "",
    iban: validIban,
    bankHolder: "Kulturhaus Lindenhof e. V.",
    includeBank: true,
  }
}

describe("veranstalterEinstellungenInputValidate validates owner settings updates", () => {
  test("accepts profile plus bank when bank editing is permitted", () => {
    const result = veranstalterEinstellungenInputValidate(validRaw())
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.profile?.name).toBe("Kulturhaus Lindenhof")
    expect(result.data.bank?.iban).toBe(validIban)
  })

  test("omits bank when bank editing is not permitted", () => {
    const result = veranstalterEinstellungenInputValidate({ ...validRaw(), includeBank: false })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.bank).toBeUndefined()
    expect(result.data.profile?.name).toBe("Kulturhaus Lindenhof")
  })

  test("rejects an invalid IBAN", () => {
    const result = veranstalterEinstellungenInputValidate({ ...validRaw(), iban: "DE00000000000000000000" })
    expect(result.success).toBe(false)
  })

  test("rejects a missing org identity", () => {
    const result = veranstalterEinstellungenInputValidate({ ...validRaw(), orgId: "" })
    expect(result.success).toBe(false)
  })

  test("rejects an unknown kind", () => {
    const result = veranstalterEinstellungenInputValidate({ ...validRaw(), kind: "gmbh" })
    expect(result.success).toBe(false)
  })
})
