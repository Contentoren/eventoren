import { expect, test } from "bun:test"
import { language } from "../src/app/i18n/language.ts"
import { siteHeaderNavLinks } from "../src/components/siteHeaderNavLinks.ts"

test("does not render session-specific header links before browser hydration", () => {
  expect(siteHeaderNavLinks(language.en, "admin", false).map((link) => link.to)).toEqual(["/"])
  expect(siteHeaderNavLinks(language.en, "admin").map((link) => link.to)).toEqual(["/", "/organizer", "/admin"])
})

test("uses German labels for all public header navigation links", () => {
  expect(siteHeaderNavLinks(language.en, "admin").map((link) => link.label)).toEqual([
    "Events entdecken",
    "Veranstalter",
    "Verwaltung",
  ])
})
