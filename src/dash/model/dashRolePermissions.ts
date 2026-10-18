import type { DashPermission } from "./dashPermissionSchema.ts"
import type { DashRole } from "./dashRoleSchema.ts"

const dashAllPermissions: ReadonlyArray<DashPermission> = [
  "events.bearbeiten",
  "tickets.bearbeiten",
  "codes.bearbeiten",
  "bestellungen.sehen",
  "bestellungen.verwalten",
  "bestellungen.erstatten",
  "gaesteliste.bearbeiten",
  "nachrichten.senden",
  "einlass.nutzen",
  "abendkasse.nutzen",
  "abendkasse.preise",
  "umsatz.sehen",
  "finanzen.sehen",
  "gutscheine.bearbeiten",
  "profil.bearbeiten",
  "team.verwalten",
  "einstellungen.bearbeiten",
  "bank.bearbeiten",
]

const dashEventManagerDenied: ReadonlySet<DashPermission> = new Set([
  "bestellungen.erstatten",
  "finanzen.sehen",
  "gutscheine.bearbeiten",
  "team.verwalten",
  "einstellungen.bearbeiten",
  "bank.bearbeiten",
])

export function dashRolePermissions(role: DashRole): ReadonlySet<DashPermission> {
  switch (role) {
    case "inhaber":
      return new Set(dashAllPermissions)
    case "admin":
      return new Set(dashAllPermissions.filter((permission) => permission !== "bank.bearbeiten"))
    case "eventmanager":
      return new Set(dashAllPermissions.filter((permission) => !dashEventManagerDenied.has(permission)))
    case "finanzen":
      return new Set([
        "bestellungen.sehen",
        "bestellungen.verwalten",
        "bestellungen.erstatten",
        "umsatz.sehen",
        "finanzen.sehen",
        "gutscheine.bearbeiten",
      ])
    case "einlass":
      return new Set(["einlass.nutzen", "abendkasse.nutzen", "gaesteliste.bearbeiten"])
  }
}
