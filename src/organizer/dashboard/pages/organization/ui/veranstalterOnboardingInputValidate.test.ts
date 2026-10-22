import { describe, expect, test } from "bun:test"
import { veranstalterOnboardingInputValidate } from "./veranstalterOnboardingInputValidate.ts"

const validIban = "DE89370400440532013000"

function validRaw() {
  return {
    name: "Kulturhaus Lindenhof",
    slug: "kulturhaus-lindenhof",
    kind: "verein",
    contactEmail: "hallo@example.org",
    contactPhone: "+49 30 123456",
    imprint: "Kulturhaus Lindenhof e. V., Beispielstraße 1, 10115 Berlin",
    iban: validIban,
    bankHolder: "Kulturhaus Lindenhof e. V.",
  }
}

describe("veranstalterOnboardingInputValidate validates technical onboarding fields", () => {
  test("accepts complete valid input without consent fields in the data", () => {
    const result = veranstalterOnboardingInputValidate(validRaw())
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.name).toBe("Kulturhaus Lindenhof")
    expect(result.data.slug).toBe("kulturhaus-lindenhof")
    expect(result.data.bank?.iban).toBe(validIban)
    expect("termsAccepted" in result.data).toBe(false)
    expect("dpaAccepted" in result.data).toBe(false)
  })

  test("maps empty optionals to absent contact and bank", () => {
    const result = veranstalterOnboardingInputValidate({
      ...validRaw(),
      contactEmail: "  ",
      contactPhone: "",
      imprint: "",
      iban: "",
      bankHolder: "",
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.contact).toBeUndefined()
    expect(result.data.imprint).toBeUndefined()
    expect(result.data.bank).toBeUndefined()
  })

  test("rejects an empty name", () => {
    const result = veranstalterOnboardingInputValidate({ ...validRaw(), name: "  " })
    expect(result.success).toBe(false)
  })

  test("rejects an invalid IBAN", () => {
    const result = veranstalterOnboardingInputValidate({ ...validRaw(), iban: "DE00000000000000000000" })
    expect(result.success).toBe(false)
  })

  test("rejects a partial bank without holder", () => {
    const result = veranstalterOnboardingInputValidate({ ...validRaw(), bankHolder: "" })
    expect(result.success).toBe(false)
  })

  test("rejects an unknown kind", () => {
    const result = veranstalterOnboardingInputValidate({ ...validRaw(), kind: "genossenschaft" })
    expect(result.success).toBe(false)
  })

  test("rejects a too-short slug", () => {
    const result = veranstalterOnboardingInputValidate({ ...validRaw(), slug: "ab" })
    expect(result.success).toBe(false)
  })
})

describe("veranstalterOnboardingInputValidate speaks German", () => {
  const englishPattern = /invalid|must be|expected|received|required|cannot|empty|missing|unknown/i
  test("invalid IBAN explains in German", () => {
    const result = veranstalterOnboardingInputValidate({ ...validRaw(), iban: "DE00000000000000000000" })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.errorMessage).toContain("IBAN")
    expect(result.errorMessage).not.toMatch(englishPattern)
  })

  test("unknown kind explains in German", () => {
    const result = veranstalterOnboardingInputValidate({ ...validRaw(), kind: "genossenschaft" })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.errorMessage).toContain("Verein")
    expect(result.errorMessage).not.toMatch(englishPattern)
  })

  test("partial bank explains in German", () => {
    const result = veranstalterOnboardingInputValidate({ ...validRaw(), bankHolder: "" })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.errorMessage).toContain("Kontoinhaber")
    expect(result.errorMessage).not.toMatch(englishPattern)
  })

  test("bad slug explains in German", () => {
    const result = veranstalterOnboardingInputValidate({ ...validRaw(), slug: "AB C" })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.errorMessage).not.toMatch(englishPattern)
  })

  test("bad contact email explains in German", () => {
    const result = veranstalterOnboardingInputValidate({ ...validRaw(), contactEmail: "keine-mail" })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.errorMessage).toContain("E-Mail")
    expect(result.errorMessage).not.toMatch(englishPattern)
  })
})
