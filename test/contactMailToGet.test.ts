import { expect, test } from "bun:test"
import { contactMailToGet } from "../src/contact/contactMailToGet.ts"

test("the organizer inquiry tab points to the already published partner address", () => {
  expect(contactMailToGet("veranstalter")).toBe("mailto:partner@eventoren.de")
})

test("the support inquiry tab points to the already published support address", () => {
  expect(contactMailToGet("support")).toBe("mailto:support@eventoren.de")
})

test("the mail address is resolved without any browser global", () => {
  // The server render must not depend on a DOM, so the address is plain data.
  expect(typeof globalThis.window).toBe("undefined")
  expect(typeof globalThis.document).toBe("undefined")
  expect(contactMailToGet("veranstalter")).toBe("mailto:partner@eventoren.de")
  expect(contactMailToGet("support")).toBe("mailto:support@eventoren.de")
})
