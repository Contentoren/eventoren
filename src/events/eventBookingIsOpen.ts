export function eventBookingIsOpen(event: { bookingOpensAt?: string }, now = Date.now()): boolean {
  if (!event.bookingOpensAt) return true
  return now >= Date.parse(event.bookingOpensAt)
}
