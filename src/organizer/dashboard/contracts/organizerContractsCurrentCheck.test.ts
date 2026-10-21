import { describe, expect, test } from "bun:test"
import { organizerContractDocuments } from "./organizerContractDocuments.ts"
import { organizerContractsCurrentCheck } from "./organizerContractsCurrentCheck.ts"

const currentContracts = {
  termsRevision: organizerContractDocuments.terms.revision,
  dpaRevision: organizerContractDocuments.dpa.revision,
  consentedByUserId: "owner-user-id",
  termsConsentedAt: "2026-10-21T09:30:00.000Z",
  dpaConsentedAt: "2026-10-21T09:30:00.000Z",
}

describe("organizerContractsCurrentCheck", () => {
  test("current revisions with an actor and valid UTC instants qualify", () => {
    expect(organizerContractsCurrentCheck(currentContracts)).toBe(true)
  })

  test("missing or empty accepting actor does not qualify", () => {
    const { consentedByUserId: _, ...withoutActor } = currentContracts
    expect(organizerContractsCurrentCheck(withoutActor)).toBe(false)
    expect(organizerContractsCurrentCheck({ ...currentContracts, consentedByUserId: "" })).toBe(false)
  })

  test.each([
    "2026-10-21T09:30:00.000+02:00",
    "2026-10-21T09:30:00.000+00:00",
    "2026-10-21 09:30:00.000Z",
    "not-a-date",
    "",
    undefined,
  ])("invalid or non-UTC consent instant %s does not qualify for either document", (instant) => {
    expect(organizerContractsCurrentCheck({ ...currentContracts, termsConsentedAt: instant })).toBe(false)
    expect(organizerContractsCurrentCheck({ ...currentContracts, dpaConsentedAt: instant })).toBe(false)
  })

  test("obsolete revisions do not qualify for either document", () => {
    expect(
      organizerContractsCurrentCheck({
        ...currentContracts,
        termsRevision: currentContracts.termsRevision.replace(/v\d+$/u, "v0"),
      }),
    ).toBe(false)
    expect(
      organizerContractsCurrentCheck({
        ...currentContracts,
        dpaRevision: currentContracts.dpaRevision.replace(/v\d+$/u, "v0"),
      }),
    ).toBe(false)
  })

  test("legacy timestamp-only evidence is never grandfathered", () => {
    const legacyContracts = {
      termsAcceptedAt: "2026-10-21T09:30:00.000Z",
      dpaAcceptedAt: "2026-10-21T09:30:00.000Z",
      termsRevision: undefined,
    }
    expect(organizerContractsCurrentCheck(legacyContracts)).toBe(false)
    expect(
      organizerContractsCurrentCheck({
        ...legacyContracts,
        termsRevision: currentContracts.termsRevision,
        dpaRevision: currentContracts.dpaRevision,
        consentedByUserId: currentContracts.consentedByUserId,
      }),
    ).toBe(false)
  })
})
