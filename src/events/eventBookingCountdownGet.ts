export function eventBookingCountdownGet(bookingOpensAt: string | undefined, now: number) {
  const opensAt = Date.parse(bookingOpensAt ?? "")
  if (!Number.isFinite(opensAt) || !Number.isFinite(now)) return undefined

  const seconds = Math.max(0, Math.ceil((opensAt - now) / 1000))
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  }
}
