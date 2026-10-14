import { expect, test } from "bun:test"
import { legalHtml } from "../src/lib/legalHtml.ts"

test("serves the same current privacy notice on both public privacy URLs", () => {
  expect(legalHtml.datenschutz).toBe(legalHtml.privacy)
  expect(legalHtml.datenschutz).toContain("sessionStorage")
  expect(legalHtml.datenschutz).toContain("eventoren-session")
  expect(legalHtml.datenschutz).not.toContain("WordPress Statistik")
  expect(legalHtml.datenschutz).not.toContain("Facebook Plugins")
  expect(legalHtml.datenschutz).not.toContain("userSessions")
})
