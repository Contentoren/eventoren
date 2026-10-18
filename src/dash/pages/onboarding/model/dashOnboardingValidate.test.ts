import { describe, expect, test } from "bun:test"

import { dashOnboardingDraftCreate } from "./dashOnboardingDraftCreate.ts"
import { dashOnboardingValidate } from "./dashOnboardingValidate.ts"

describe("dashOnboardingValidate", () => {
  test("Schritt 1 prüft Name, E-Mail und Passwort", () => {
    const draft = {
      ...dashOnboardingDraftCreate(""),
      accountName: "A",
      accountEmail: "falsch",
      accountPassword: "kurz",
    }
    const errors = dashOnboardingValidate(0, draft)
    expect(errors.accountName).toContain("2 Zeichen")
    expect(errors.accountEmail).toContain("gültige E-Mail")
    expect(errors.accountPassword).toContain("8 Zeichen")
    expect(
      dashOnboardingValidate(0, {
        ...draft,
        accountName: "Mara",
        accountEmail: "mara@test.de",
        accountPassword: "geheim123",
      }),
    ).toEqual({})
  })

  test("Schritt 2 prüft Name und Slug inklusive Belegung", () => {
    const draft = { ...dashOnboardingDraftCreate(""), orgName: "A", slug: "OK_!" }
    const errors = dashOnboardingValidate(1, draft, ["tanzschule-rhythmus"])
    expect(errors.orgName).toContain("2 Zeichen")
    expect(errors.slug).toContain("Kleinbuchstaben")
    expect(
      dashOnboardingValidate(1, { ...draft, orgName: "Tanzschule", slug: "tanzschule-rhythmus" }, [
        "tanzschule-rhythmus",
      ]).slug,
    ).toContain("schon vergeben")
  })

  test("Schritt 3 prüft Impressum, Register (nur ohne Privatperson) und IBAN", () => {
    const draft = { ...dashOnboardingDraftCreate(""), kind: "verein" as const, iban: "DE00" }
    const errors = dashOnboardingValidate(2, draft)
    expect(errors.legalName).toContain("Impressum")
    expect(errors.register).toContain("Register")
    expect(errors.holder).toContain("Kontoinhaber")
    expect(errors.iban).toContain("ungültig")
    const privat = { ...draft, kind: "privat" as const }
    expect(dashOnboardingValidate(2, privat).register).toBeUndefined()
    expect(
      dashOnboardingValidate(2, {
        ...draft,
        legalName: "Tanzschule Rhythmus",
        street: "Tanzweg 1",
        zip: "04109",
        city: "Leipzig",
        representative: "Mara R.",
        register: "HRB 1",
        holder: "Tanzschule Rhythmus",
        iban: "DE89370400440532013000",
      }),
    ).toEqual({})
  })

  test("Schritt 4 hat keine Feldfehler", () => {
    expect(dashOnboardingValidate(3, dashOnboardingDraftCreate(""))).toEqual({})
  })
})
