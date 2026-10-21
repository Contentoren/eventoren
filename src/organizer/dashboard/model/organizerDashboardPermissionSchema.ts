import * as v from "valibot"

export const organizerDashboardPermissionSchema = v.picklist([
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
])

export type OrganizerDashboardPermission = v.InferOutput<typeof organizerDashboardPermissionSchema>
