import type { VeranstalterDashboardRole } from "./veranstalterDashboardRoleSchema.ts"

export function veranstalterDashboardRoleLabel(role: VeranstalterDashboardRole): {
  readonly label: "Inhaber" | "Admin" | "Event-Manager" | "Finanzen" | "Einlass"
  readonly description: string
} {
  switch (role) {
    case "inhaber":
      return { label: "Inhaber", description: "Alle Rechte in der Organisation." }
    case "admin":
      return { label: "Admin", description: "Fast alle Rechte, ohne Bankdaten." }
    case "eventmanager":
      return { label: "Event-Manager", description: "Events und Einlass verwalten, ohne Finanzen." }
    case "finanzen":
      return { label: "Finanzen", description: "Bestellungen, Auszahlungen und Gutscheine im Blick." }
    case "einlass":
      return { label: "Einlass", description: "Check-in und Abendkasse – sonst nichts." }
  }
}
