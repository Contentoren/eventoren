import { describe, expect, test } from "bun:test"
import { adminVeranstalterRedirectOptionsResolve } from "../src/routes/-adminVeranstalterRedirectOptionsResolve.ts"

describe("admin Veranstalter route", () => {
  test("redirects existing links to the organizer-filtered members page", () => {
    expect(adminVeranstalterRedirectOptionsResolve()).toEqual({
      to: "/admin/mitglieder",
      search: { memberRole: "organizer" },
    })
  })
})
