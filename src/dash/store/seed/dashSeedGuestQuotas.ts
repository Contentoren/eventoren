import type { DashGuestQuota } from "../../model/dashGuestQuotaSchema.ts"

export function dashSeedGuestQuotas(): DashGuestQuota[] {
  return [
    { id: "gq-winter-presse", eventId: "ev-winterball", name: "Presse", limit: 20 },
    { id: "gq-winter-band", eventId: "ev-winterball", name: "Band & Crew", limit: 30 },
    { id: "gq-winter-verein", eventId: "ev-winterball", name: "Freikarten Verein", limit: 40 },
    { id: "gq-indie-gaeste", eventId: "ev-indie-night", name: "Gästeliste", limit: 25 },
  ]
}
