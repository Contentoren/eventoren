import { mdiBank } from "@adaptive-ds/mdi/mdiBank.js"
import { mdiCalendarMonth } from "@adaptive-ds/mdi/mdiCalendarMonth.js"
import { mdiCrown } from "@adaptive-ds/mdi/mdiCrown.js"
import { mdiQrcodeScan } from "@adaptive-ds/mdi/mdiQrcodeScan.js"
import { mdiShieldAccount } from "@adaptive-ds/mdi/mdiShieldAccount.js"

import type { DashRole } from "./dashRoleSchema.ts"

export function dashRoleLabel(role: DashRole): {
  label: "Inhaber" | "Admin" | "Event-Manager" | "Finanzen" | "Einlass"
  description: string
  icon: string
} {
  switch (role) {
    case "inhaber":
      return { label: "Inhaber", description: "Du hast alle Rechte, auch Bankdaten.", icon: mdiCrown }
    case "admin":
      return { label: "Admin", description: "Fast alle Rechte – nur keine Bankdaten.", icon: mdiShieldAccount }
    case "eventmanager":
      return {
        label: "Event-Manager",
        description: "Events und Einlass verwalten, ohne Finanzen.",
        icon: mdiCalendarMonth,
      }
    case "finanzen":
      return {
        label: "Finanzen",
        description: "Bestellungen, Auszahlungen und Gutscheine im Blick.",
        icon: mdiBank,
      }
    case "einlass":
      return { label: "Einlass", description: "Check-in und Abendkasse – sonst nichts.", icon: mdiQrcodeScan }
  }
}
