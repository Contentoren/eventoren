import { expect, test } from "bun:test"
import { scannerLinkErrorMessageGet } from "../src/organizer/scannerLinkErrorMessageGet.ts"
import { scannerLinkEventHrefCreate } from "../src/organizer/scannerLinkEventHrefCreate.ts"
import { scannerLinkHeadCreate } from "../src/organizer/scannerLinkHeadCreate.ts"
import { scannerLinkListHrefCreate } from "../src/organizer/scannerLinkListHrefCreate.ts"
import { scannerLinkPathIsPublic } from "../src/organizer/scannerLinkPathIsPublic.ts"
import { speculationRules } from "../src/routes/speculationRules.ts"

test("scanner link routes stay public without making SSO organizer paths public", () => {
  expect(scannerLinkPathIsPublic("/scanner/secret")).toBe(true)
  expect(scannerLinkPathIsPublic("/scanner/secret/event/festival")).toBe(true)
  expect(scannerLinkPathIsPublic("/organizer/event/festival")).toBe(false)
  expect(scannerLinkPathIsPublic("/scanner-elsewhere/secret")).toBe(false)
})

test("scanner links keep the bearer only on same-origin scanner paths and prohibit referral", () => {
  expect(scannerLinkListHrefCreate("code/one")).toBe("/scanner/code%2Fone")
  expect(scannerLinkEventHrefCreate("code/one", "event two")).toBe("/scanner/code%2Fone/event/event%20two")
  expect(scannerLinkHeadCreate().meta).toContainEqual({ name: "referrer", content: "no-referrer" })
  expect(scannerLinkHeadCreate().meta).toContainEqual({ name: "robots", content: "noindex, nofollow, noarchive" })
  expect(speculationRules).toContain('"href_matches":"/scanner/*"')
})

test("invalid or revoked links and inaccessible events show understandable errors without leaking backend details", () => {
  expect(scannerLinkErrorMessageGet("Link unavailable")).toContain("abgelaufen oder wurde widerrufen")
  expect(scannerLinkErrorMessageGet("Event unavailable")).toContain("nicht verfügbar")
  expect(scannerLinkErrorMessageGet("database internal details")).not.toContain("database")
})
