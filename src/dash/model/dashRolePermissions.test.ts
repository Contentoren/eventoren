import { describe, expect, test } from "bun:test"

import type { DashRole } from "./dashRoleSchema.ts"
import { dashRoleLabel } from "./dashRoleLabel.ts"
import { dashRolePermissions } from "./dashRolePermissions.ts"

const dashAllRoles: ReadonlyArray<DashRole> = ["inhaber", "admin", "eventmanager", "finanzen", "einlass"]

describe("dashRolePermissions", () => {
  test("inhaber hat alle 18 Rechte", () => {
    expect(dashRolePermissions("inhaber").size).toBe(18)
  })

  test("admin hat alle Rechte außer bank.bearbeiten", () => {
    const permissions = dashRolePermissions("admin")
    expect(permissions.size).toBe(17)
    expect(permissions.has("bank.bearbeiten")).toBe(false)
    expect(permissions.has("team.verwalten")).toBe(true)
  })

  test("eventmanager hat genau die sechs ausgeschlossenen Rechte nicht", () => {
    const permissions = dashRolePermissions("eventmanager")
    for (const denied of [
      "bestellungen.erstatten",
      "finanzen.sehen",
      "gutscheine.bearbeiten",
      "team.verwalten",
      "einstellungen.bearbeiten",
      "bank.bearbeiten",
    ] as const)
      expect(permissions.has(denied)).toBe(false)
    expect(permissions.size).toBe(12)
    expect(permissions.has("events.bearbeiten")).toBe(true)
    expect(permissions.has("einlass.nutzen")).toBe(true)
    expect(permissions.has("umsatz.sehen")).toBe(true)
  })

  test("finanzen sieht Bestellungen, Umsatz, Finanzen und Gutscheine", () => {
    const permissions = dashRolePermissions("finanzen")
    expect([...permissions].sort() as string[]).toEqual(
      (
        [
          "bestellungen.erstatten",
          "bestellungen.sehen",
          "bestellungen.verwalten",
          "finanzen.sehen",
          "gutscheine.bearbeiten",
          "umsatz.sehen",
        ] as string[]
      ).sort(),
    )
  })

  test("einlass nutzt nur Einlass, Abendkasse und Gästeliste", () => {
    const permissions = dashRolePermissions("einlass")
    expect([...permissions].sort() as string[]).toEqual(
      (["abendkasse.nutzen", "einlass.nutzen", "gaesteliste.bearbeiten"] as string[]).sort(),
    )
    expect(permissions.has("umsatz.sehen")).toBe(false)
  })
})

describe("dashRoleLabel", () => {
  test("liefert Label, Beschreibung und Icon je Rolle", () => {
    expect(dashRoleLabel("inhaber").label).toBe("Inhaber")
    expect(dashRoleLabel("admin").label).toBe("Admin")
    expect(dashRoleLabel("eventmanager").label).toBe("Event-Manager")
    expect(dashRoleLabel("finanzen").label).toBe("Finanzen")
    expect(dashRoleLabel("einlass").label).toBe("Einlass")
    for (const role of dashAllRoles) {
      const entry = dashRoleLabel(role)
      expect(entry.description.length).toBeGreaterThan(0)
      expect(entry.icon.startsWith("M")).toBe(true)
    }
  })
})
