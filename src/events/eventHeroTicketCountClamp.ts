export function eventHeroTicketCountClamp(value: number): number {
  if (!Number.isFinite(value)) return 1
  if (value < 1) return 1
  if (value > 10) return 10

  return Math.round(value)
}
