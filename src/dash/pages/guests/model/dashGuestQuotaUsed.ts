import type { DashGuest } from "../../../model/dashGuestSchema.ts"

/**
 * Belegte Plätze eines Kontingents: jede Zeile zählt 1 + Begleitpersonen.
 * Einzige Zählstelle für Gästeliste-Quoten – Seed, Actions und UI nutzen sie.
 */
export function dashGuestQuotaUsed(guests: Pick<DashGuest, "plusOnes">[]): number {
  return guests.reduce((sum, guest) => sum + 1 + guest.plusOnes, 0)
}
