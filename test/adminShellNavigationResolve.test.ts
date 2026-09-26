import { describe, expect, test } from "bun:test"
import { adminShellNavigationResolve } from "../src/admin/adminShellNavigationResolve.ts"

describe("adminShellNavigationResolve", () => {
  test("returns only events item when in organizer area and user is not admin", () => {
    const items = adminShellNavigationResolve("organizer", false)
    expect(items).toEqual([{ href: "/organizer", icon: expect.any(String), label: "Events" }])
  })

  test("returns all admin items when in organizer area and user is admin", () => {
    const items = adminShellNavigationResolve("organizer", true)
    expect(items.map((i) => i.href)).toEqual([
      "/admin/bestellungen",
      "/organizer",
      "/admin/events",
      "/admin/veranstalter",
      "/admin/mitglieder",
    ])
    expect(items.map((i) => i.label)).toEqual([
      "Bestellungen",
      "Ticket-Scanner",
      "Events",
      "Veranstalter",
      "Mitglieder",
    ])
  })

  test("returns all admin items when in admin area", () => {
    const itemsAdmin = adminShellNavigationResolve("admin", false)
    expect(itemsAdmin.map((i) => i.href)).toEqual([
      "/admin/bestellungen",
      "/organizer",
      "/admin/events",
      "/admin/veranstalter",
      "/admin/mitglieder",
    ])
  })
})
