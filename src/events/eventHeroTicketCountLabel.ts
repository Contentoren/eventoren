export function eventHeroTicketCountLabel(count: number): string {
  if (count === 1) return "1 Ticket · Erwachsene/r"

  return `${count} Tickets · Erwachsene`
}
