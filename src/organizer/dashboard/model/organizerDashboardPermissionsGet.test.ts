import { describe, expect, test } from "bun:test"
import * as v from "valibot"

import { dashRolePermissions } from "#src/dash/model/dashRolePermissions.ts"
import { orgRoleSchema } from "#src/org/org_model_field/orgRole.ts"
import { organizerDashboardPermissionSchema } from "./organizerDashboardPermissionSchema.ts"
import type { OrganizerDashboardRole } from "./organizerDashboardRoleSchema.ts"
import { organizerDashboardRoleSchema } from "./organizerDashboardRoleSchema.ts"
import { organizerDashboardPermissionsGet } from "./organizerDashboardPermissionsGet.ts"

const organizerDashboardAllRoles: ReadonlyArray<OrganizerDashboardRole> = [
  "inhaber",
  "admin",
  "eventmanager",
  "finanzen",
  "einlass",
]

describe("organizerDashboardPermissionsGet", () => {
  test("liefert je Rolle dieselben Rechte wie die Demo-Matrix", () => {
    for (const role of organizerDashboardAllRoles) {
      expect([...organizerDashboardPermissionsGet(role)].sort() as string[]).toEqual(
        [...dashRolePermissions(role)].sort() as string[],
      )
    }
  })

  test("inhaber hat alle 18 Rechte, einlass nur Einlass-Rechte", () => {
    expect(organizerDashboardPermissionsGet("inhaber").size).toBe(18)
    expect([...organizerDashboardPermissionsGet("einlass")].sort() as string[]).toEqual(
      (["abendkasse.nutzen", "einlass.nutzen", "gaesteliste.bearbeiten"] as string[]).sort(),
    )
  })

  test("admin fehlen nur bank.bearbeiten, finanzen sieht nur Bestellungen, Umsatz, Finanzen, Gutscheine", () => {
    const adminPermissions = organizerDashboardPermissionsGet("admin")
    expect(adminPermissions.size).toBe(17)
    expect(adminPermissions.has("bank.bearbeiten")).toBe(false)
    expect([...organizerDashboardPermissionsGet("finanzen")].sort() as string[]).toEqual(
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
})

describe("organizerDashboardRoleSchema", () => {
  test("akzeptiert alle fünf deutschen Rollenliterale", () => {
    for (const role of organizerDashboardAllRoles) {
      expect(v.safeParse(organizerDashboardRoleSchema, role).success).toBe(true)
    }
  })

  test("lehnt Legacy-Rollen member und guest sowie Unbekanntes ab", () => {
    for (const role of ["member", "guest", "owner", ""]) {
      expect(v.safeParse(organizerDashboardRoleSchema, role).success).toBe(false)
    }
  })

  test("Legacy-orgRole bleibt member|guest und nimmt keine Dashboard-Rolle an", () => {
    expect(v.safeParse(orgRoleSchema, "member").success).toBe(true)
    expect(v.safeParse(orgRoleSchema, "guest").success).toBe(true)
    for (const role of organizerDashboardAllRoles) {
      expect(v.safeParse(orgRoleSchema, role).success).toBe(false)
    }
  })
})

describe("organizerDashboardPermissionSchema", () => {
  test("alle von der Matrix gelieferten Rechte parsen", () => {
    for (const role of organizerDashboardAllRoles) {
      for (const permission of organizerDashboardPermissionsGet(role)) {
        expect(v.safeParse(organizerDashboardPermissionSchema, permission).success).toBe(true)
      }
    }
    expect(v.safeParse(organizerDashboardPermissionSchema, "unbekannt.recht").success).toBe(false)
  })
})
