import { describe, expect, test } from "bun:test"
import { veranstalterOrganisationenAdminBerlinTimeFormat } from "./veranstalterOrganisationenAdminBerlinTimeFormat.ts"
import { veranstalterOrganisationenAdminConfigureValidate } from "./veranstalterOrganisationenAdminConfigureValidate.ts"
import { veranstalterOrganisationenAdminSearchParse } from "./veranstalterOrganisationenAdminSearchParse.ts"

function validRaw() {
  return {
    orgId: "org_123",
    taxStatus: "regel",
    taxRateBps: "1900",
    feePercent: "2,5",
    feeFixedEuro: "1,20",
    feePayer: "kaeufer",
  }
}

describe("veranstalterOrganisationenAdminConfigureValidate coerces admin tax and fee input", () => {
  test("maps a comma percent to integer bps and euro to integer cents", () => {
    const result = veranstalterOrganisationenAdminConfigureValidate(validRaw())
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.fee.percentBps).toBe(250)
    expect(result.data.fee.fixedCents).toBe(120)
    expect(result.data.tax).toEqual({ status: "regel", defaultRateBps: 1900 })
  })

  test("keeps tax status and the 7 percent rate independent", () => {
    const kleinSeven = veranstalterOrganisationenAdminConfigureValidate({
      ...validRaw(),
      taxStatus: "klein",
      taxRateBps: "700",
    })
    expect(kleinSeven.success).toBe(true)
    const kleinNineteen = veranstalterOrganisationenAdminConfigureValidate({
      ...validRaw(),
      taxStatus: "klein",
      taxRateBps: "1900",
    })
    expect(kleinNineteen.success).toBe(true)
  })

  test("rejects a percent above 100", () => {
    const result = veranstalterOrganisationenAdminConfigureValidate({ ...validRaw(), feePercent: "100,01" })
    expect(result.success).toBe(false)
  })

  test("rejects a non-numeric percent", () => {
    const result = veranstalterOrganisationenAdminConfigureValidate({ ...validRaw(), feePercent: "viel" })
    expect(result.success).toBe(false)
  })

  test("rejects a non-euro fixed amount", () => {
    const result = veranstalterOrganisationenAdminConfigureValidate({ ...validRaw(), feeFixedEuro: "1,234" })
    expect(result.success).toBe(false)
  })

  test("rejects an unknown tax rate", () => {
    const result = veranstalterOrganisationenAdminConfigureValidate({ ...validRaw(), taxRateBps: "800" })
    expect(result.success).toBe(false)
  })

  test("rejects an unknown fee payer", () => {
    const result = veranstalterOrganisationenAdminConfigureValidate({ ...validRaw(), feePayer: "stadt" })
    expect(result.success).toBe(false)
  })
})

describe("veranstalterOrganisationenAdminSearchParse validates admin list search", () => {
  test("accepts a known status and a well-formed org id", () => {
    expect(veranstalterOrganisationenAdminSearchParse({ status: "aktiv", org: "abc123" })).toEqual({
      status: "aktiv",
      org: "abc123",
    })
  })

  test("drops an unknown status and keeps the org", () => {
    expect(veranstalterOrganisationenAdminSearchParse({ status: "archiviert", org: "abc123" })).toEqual({
      status: undefined,
      org: "abc123",
    })
  })

  test("drops a malformed org id", () => {
    expect(veranstalterOrganisationenAdminSearchParse({ org: "../../etc" }).org).toBeUndefined()
  })

  test("handles non-object input", () => {
    expect(veranstalterOrganisationenAdminSearchParse(null)).toEqual({ status: undefined, org: undefined })
  })
})

describe("veranstalterOrganisationenAdminBerlinTimeFormat formats admin timestamps", () => {
  test("formats an ISO instant in Europe/Berlin", () => {
    const formatted = veranstalterOrganisationenAdminBerlinTimeFormat("2026-01-15T12:00:00.000Z")
    expect(formatted).not.toBeNull()
    expect(formatted).toContain("2026")
  })

  test("returns null for missing or unparsable input", () => {
    expect(veranstalterOrganisationenAdminBerlinTimeFormat(undefined)).toBeNull()
    expect(veranstalterOrganisationenAdminBerlinTimeFormat("kein-datum")).toBeNull()
  })
})
