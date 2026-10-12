import { describe, expect, test } from "bun:test"
import { adminActivationCodeExportFilename } from "../src/admin/adminActivationCodeExportFilename.ts"

describe("adminActivationCodeExportFilename", () => {
  test("builds a meaningful event-product filename with the requested extension", () => {
    expect(adminActivationCodeExportFilename("Sommerfest", "Abendticket", "csv")).toBe(
      "freischaltungscodes-sommerfest-abendticket.csv",
    )
    expect(adminActivationCodeExportFilename("Sommerfest", "Abendticket", "pdf")).toBe(
      "freischaltungscodes-sommerfest-abendticket.pdf",
    )
  })

  test("transliterates umlauts and strips unsafe filename characters", () => {
    expect(adminActivationCodeExportFilename("Müller-Straße Grüße!", "Tagespass (VIP) 2026", "csv")).toBe(
      "freischaltungscodes-muller-strasse-grusse-tagespass-vip-2026.csv",
    )
  })

  test("falls back for empty names instead of producing dot segments", () => {
    expect(adminActivationCodeExportFilename("   ", "///", "pdf")).toBe("freischaltungscodes-event-produkt.pdf")
    const filename = adminActivationCodeExportFilename("Fest", "Pass", "csv")
    expect(filename).not.toContain("..")
    expect(filename).not.toContain("/")
  })
})
