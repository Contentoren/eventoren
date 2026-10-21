import type { VeranstalterDashboardOrganizationStatus } from "./veranstalterDashboardOrganizationStatusSchema.ts"

export function veranstalterDashboardOrganizationStatusLabel(status: VeranstalterDashboardOrganizationStatus): {
  readonly label: "Aktiv" | "Ausstehend" | "Gesperrt"
  readonly description: string
} {
  switch (status) {
    case "aktiv":
      return { label: "Aktiv", description: "Die Organisation kann veröffentlichen und verkaufen." }
    case "ausstehend":
      return { label: "Ausstehend", description: "Wartet auf Freigabe – Veröffentlichung noch gesperrt." }
    case "gesperrt":
      return { label: "Gesperrt", description: "Veröffentlichung und Verkauf sind gesperrt." }
  }
}
