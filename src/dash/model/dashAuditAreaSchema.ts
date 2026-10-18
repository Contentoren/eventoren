import * as v from "valibot"

export const dashAuditAreaSchema = v.picklist([
  "event",
  "tickets",
  "codes",
  "bestellungen",
  "gaesteliste",
  "nachrichten",
  "einlass",
  "abendkasse",
  "profil",
  "team",
  "einstellungen",
  "admin",
])

export type DashAuditArea = v.InferOutput<typeof dashAuditAreaSchema>
