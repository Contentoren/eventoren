import { describe, expect, test } from "bun:test"

import type { DashPermission } from "../../model/dashPermissionSchema.ts"
import { dashRolePermissions } from "../../model/dashRolePermissions.ts"
import type { DashRole } from "../../model/dashRoleSchema.ts"
import { dashNavItemsCreate } from "./dashNavItemsCreate.ts"

function canFor(role: DashRole): (permission: DashPermission) => boolean {
  const permissions = dashRolePermissions(role)
  return (permission) => permissions.has(permission)
}

const allCan = () => true

describe("dashNavItemsCreate", () => {
  test("Org-Navigation für Inhaber zeigt alle Einträge mit Events-Zähler", () => {
    const { main, section } = dashNavItemsCreate({ context: "org", upcomingCount: 3, can: allCan })
    expect(main.map((item) => item.label)).toEqual(["Übersicht", "Events", "Bestellungen", "Gutscheine", "Finanzen"])
    expect(main[1]?.count).toBe(3)
    expect(main[0]).toMatchObject({ to: "/demo/dashboard", match: "exact" })
    expect(main[1]).toMatchObject({ to: "/demo/dashboard/events", match: "prefix" })
    expect(section?.map((item) => item.label)).toEqual(["Profil", "Team", "Einstellungen"])
  })

  test("Einlass-Rolle sieht nur freigegebene Org-Einträge", () => {
    const { main, section } = dashNavItemsCreate({ context: "org", can: canFor("einlass") })
    expect(main.map((item) => item.label)).toEqual(["Übersicht", "Events"])
    expect(section).toEqual([])
  })

  test("Event-Navigation baut Unterseiten-Pfade und blendet ohne Recht aus", () => {
    const { main } = dashNavItemsCreate({ context: "event", eventId: "ev-sommernacht", can: canFor("eventmanager") })
    const byLabel = new Map(main.map((item) => [item.label, item]))
    expect(byLabel.get("Übersicht")).toMatchObject({ to: "/demo/dashboard/events/ev-sommernacht", match: "exact" })
    expect(byLabel.get("Details")).toMatchObject({ to: "/demo/dashboard/events/ev-sommernacht/details" })
    expect(byLabel.has("Abrechnung")).toBe(false)
    expect(byLabel.has("Gutscheine")).toBe(false)
    expect(byLabel.get("Teilnehmer")).toBeDefined()
    expect(byLabel.get("Protokoll")).toBeDefined()
  })

  test("Finanzen-Rolle sieht in der Event-Navigation nur Abrechnung, Gästeliste fehlt", () => {
    const { main } = dashNavItemsCreate({ context: "event", eventId: "ev-x", can: canFor("finanzen") })
    const labels = main.map((item) => item.label)
    expect(labels).toContain("Abrechnung")
    expect(labels).toContain("Bestellungen")
    expect(labels).not.toContain("Details")
    expect(labels).not.toContain("Tickets")
    expect(labels).not.toContain("Einlass")
  })

  test("Live-Punkt erscheint nur beim Einlass-Eintrag im Live-Zustand", () => {
    const live = dashNavItemsCreate({ context: "event", eventId: "ev-x", eventLive: true, can: allCan })
    const entry = live.main.find((item) => item.label === "Einlass")
    expect(entry?.liveDot).toBe(true)
    const notLive = dashNavItemsCreate({ context: "event", eventId: "ev-x", eventLive: false, can: allCan })
    expect(notLive.main.find((item) => item.label === "Einlass")?.liveDot).toBe(false)
  })

  test("Gästeliste braucht das eigene Recht, Teilnehmer akzeptiert Bestellungen- oder Einlass-Recht", () => {
    const onlyEntry = dashNavItemsCreate({
      context: "event",
      eventId: "ev-x",
      can: (permission) => permission === "einlass.nutzen",
    })
    const labels = onlyEntry.main.map((item) => item.label)
    expect(labels).toContain("Teilnehmer")
    expect(labels).not.toContain("Gästeliste")
    expect(labels).not.toContain("Bestellungen")
  })
})
