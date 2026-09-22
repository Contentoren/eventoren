import { expect, test } from "bun:test"
import { language } from "../src/app/i18n/language.ts"
import { languageSignal } from "../src/app/i18n/languageSignal.ts"
import { demoStaticPages } from "../src/demo/fixtures/demoStaticPages.ts"
import { demoOrganizerTextGet } from "../src/demo/model/demoOrganizerTextGet.ts"
import { demoScenarios } from "../src/demo/model/demoScenarios.js"
import { demoScenarioText } from "../src/demo/model/demoScenarioText.ts"
import { demoText } from "../src/demo/model/demoText.ts"
import { demoAdminMemberManagementStateCreate } from "../src/demo/state/demoAdminMemberManagementStateCreate.ts"

test("demo shell and navigation copy stays German regardless of app language", () => {
  const keys = [
    "shellTitle",
    "shellDetail",
    "shellDirectory",
    "directoryEyebrow",
    "directoryTitle",
    "directoryDescription",
    "open",
    "navigationEyebrow",
    "navigationTitle",
    "navigationDescription",
    "navigationOpen",
    "controlsButton",
    "controlsTitle",
    "controlsClose",
    "controlsDirectory",
    "groupCustomerTitle",
    "groupCustomerDescription",
    "groupCustomerEntry",
    "groupAdminTitle",
    "groupAdminDescription",
    "groupAdminEntry",
    "groupSharedTitle",
    "groupSharedDescription",
    "groupSharedEntry",
    "quickEntriesTitle",
    "quickEntryCustomer",
    "quickEntryAdmin",
    "quickEntryScanner",
  ] as const

  languageSignal.set(language.en)
  const englishLocaleCopy = keys.map((key) => demoText(key))
  languageSignal.set(language.de)

  expect(keys.map((key) => demoText(key))).toEqual(englishLocaleCopy)
  expect(englishLocaleCopy).toContain("Demo-Verzeichnis")
  expect(englishLocaleCopy).toContain("Menü öffnen")
  languageSignal.set(language.en)
})

test("demo checkout copy stays German regardless of app language", () => {
  const keys = [
    "checkoutOrderEyebrow",
    "checkoutCompletedTitle",
    "checkoutCompletedDescription",
    "checkoutDiscoverEvents",
    "checkoutCartLink",
    "checkoutTitle",
    "checkoutEmptyCart",
    "checkoutCartLinkShort",
    "checkoutPaymentDescription",
    "checkoutSubmitLabel",
    "checkoutLegalRequired",
    "checkoutContactRequired",
  ] as const

  languageSignal.set(language.en)
  const englishLocaleCopy = keys.map((key) => demoText(key))
  languageSignal.set(language.de)
  expect(keys.map((key) => demoText(key))).toEqual(englishLocaleCopy)
  expect(englishLocaleCopy).toContain("Kasse")
  expect(englishLocaleCopy).toContain("Demo-Bestellung abschließen")
  languageSignal.set(language.en)
})

test("all public demo scenario metadata stays German regardless of app language", () => {
  languageSignal.set(language.en)
  const englishLocaleScenarios = demoScenarios.map((scenario) => demoScenarioText(scenario))
  languageSignal.set(language.de)
  const germanLocaleScenarios = demoScenarios.map((scenario) => demoScenarioText(scenario))

  expect(germanLocaleScenarios).toEqual(englishLocaleScenarios)
  expect(englishLocaleScenarios.map((scenario) => scenario.title)).toContain("Mobiles Navigationsmenü")
  expect(englishLocaleScenarios.map((scenario) => scenario.title)).toContain("Datenschutz")
  expect(englishLocaleScenarios.map((scenario) => scenario.title)).not.toContain("Privacy")
  languageSignal.set(language.en)
})

test("demo organizer copy, legal fixtures, and member dates are German", () => {
  const organizerText = demoOrganizerTextGet()
  expect(Object.values(organizerText)).not.toContain("Scanner simulation")
  expect(Object.values(organizerText)).not.toContain("Scan success")
  expect(Object.values(organizerText)).not.toContain("Deny camera access")

  expect(demoStaticPages.legal.privacy).toContain("Datenschutzerklärung")
  expect(demoStaticPages.legal.privacy).not.toContain("Privacy Policy")
  expect(demoStaticPages.legal.terms).toContain("Allgemeine Geschäftsbedingungen")
  expect(demoStaticPages.legal.terms).not.toContain("Terms of Service")
  expect(demoStaticPages.legal.agb.title).toContain("Allgemeine Geschäftsbedingungen")
  expect(demoStaticPages.legal.agb.html).not.toContain("Disclaimer")

  const state = demoAdminMemberManagementStateCreate()
  const date = new Date("2026-02-03T16:05:00.000Z")
  expect(state.invitationFormat(date.toISOString())).toBe(
    new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(date),
  )
  expect(state.invitationFormat(date.toISOString())).not.toBe(
    new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date),
  )
})
