import * as v from "valibot"
const bounded = (max: number) => v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(max))
const secret = v.pipe(v.string(), v.regex(/^[a-f0-9]{64}$/))
const calendarDate = v.pipe(
  v.string(),
  v.regex(/^\d{4}-\d{2}-\d{2}$/),
  v.check((value) => {
    const date = new Date(`${value}T12:00:00Z`)
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  }, "Ungültiges Kalenderdatum"),
)
export const organizerTerminationRequestSchema = v.pipe(
  v.strictObject({
    kind: v.picklist(["widerruf", "kuendigung"]),
    legalName: bounded(200),
    email: v.pipe(bounded(254), v.email()),
    contractReference: bounded(500),
    requestedDate: v.optional(calendarDate),
    extraordinaryReason: v.optional(bounded(4000)),
    requestKey: secret,
    receiptToken: secret,
  }),
  v.check(
    (value) => value.kind === "kuendigung" || (!value.requestedDate && !value.extraordinaryReason),
    "Zusatzangaben sind nur bei Kündigung möglich",
  ),
)
export type OrganizerTerminationRequest = v.InferOutput<typeof organizerTerminationRequestSchema>
