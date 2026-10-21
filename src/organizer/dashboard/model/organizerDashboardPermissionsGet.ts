import type { OrganizerDashboardPermission } from "./organizerDashboardPermissionSchema.ts"
import type { OrganizerDashboardRole } from "./organizerDashboardRoleSchema.ts"

const organizerDashboardAllPermissions: ReadonlyArray<OrganizerDashboardPermission> = [
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

const organizerDashboardEventManagerDenied: ReadonlySet<OrganizerDashboardPermission> = new Set([
  "bestellungen.erstatten",
  "finanzen.sehen",
  "gutscheine.bearbeiten",
  "team.verwalten",
  "einstellungen.bearbeiten",
  "bank.bearbeiten",
])

export function organizerDashboardPermissionsGet(
  role: OrganizerDashboardRole,
): ReadonlySet<OrganizerDashboardPermission> {
  switch (role) {
    case "inhaber":
      return new Set(organizerDashboardAllPermissions)
    case "admin":
      return new Set(organizerDashboardAllPermissions.filter((permission) => permission !== "bank.bearbeiten"))
    case "eventmanager":
      return new Set(
        organizerDashboardAllPermissions.filter((permission) => !organizerDashboardEventManagerDenied.has(permission)),
      )
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
