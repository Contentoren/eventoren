import { expect, test } from "bun:test"
import { language } from "../src/app/i18n/language.ts"
import { siteHeaderNavLinks } from "../src/components/siteHeaderNavLinks.ts"

test("does not render session-specific header links before browser hydration", () => {
  expect(siteHeaderNavLinks(language.en, "admin", false).map((link) => link.to)).toEqual(["/", "/ratgeber"])
  expect(siteHeaderNavLinks(language.en, "admin").map((link) => link.to)).toEqual([
    "/",
    "/ratgeber",
    "/organizer",
    "/admin",
  ])
})

test("shows the Ratgeber link to anonymous visitors right after Events entdecken", () => {
  expect(siteHeaderNavLinks(language.de).map((link) => link.to)).toEqual(["/", "/ratgeber"])
})

test("uses German labels for all public header navigation links", () => {
  expect(siteHeaderNavLinks(language.en, "admin").map((link) => link.label)).toEqual([
    "Events entdecken",
    "Ratgeber",
    "Veranstalter",
    "Verwaltung",
  ])
})

test("provides an icon for every header navigation link", () => {
  const links = siteHeaderNavLinks(language.en, "admin")
  expect(links.length).toBeGreaterThan(0)
  for (const link of links) {
    expect(link.icon.length).toBeGreaterThan(0)
  }
  expect(new Set(links.map((link) => link.icon)).size).toBe(links.length)
})
