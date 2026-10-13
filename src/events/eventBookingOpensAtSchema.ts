import * as v from "valibot"

export const eventBookingOpensAtSchema = v.pipe(
  v.string(),
  v.isoTimestamp("Booking opening must be an ISO date and time with a timezone"),
  v.check((value) => {
    const date = value.slice(0, 10)
    const calendarDate = Date.parse(`${date}T00:00:00Z`)
    return (
      Number.isFinite(Date.parse(value)) &&
      Number.isFinite(calendarDate) &&
      new Date(calendarDate).toISOString().slice(0, 10) === date
    )
  }, "Booking opening must be a valid date and time"),
)
