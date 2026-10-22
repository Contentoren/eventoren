import * as v from "valibot"

/** Berlin calendar day (YYYY-MM-DD) used for finance filters and day buckets. */
export const organizerDashboardBerlinDaySchema = v.pipe(
  v.string(),
  v.trim(),
  v.regex(/^\d{4}-\d{2}-\d{2}$/, "Tag als JJJJ-MM-TT"),
)

export type OrganizerDashboardBerlinDay = v.InferOutput<typeof organizerDashboardBerlinDaySchema>

const id = v.pipe(v.string(), v.trim(), v.nonEmpty("Bitte wähle zuerst eine Organisation."))

const eventKey = v.optional(
  v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "Ein Veranstaltungsschlüssel ist erforderlich."),
    v.maxLength(200, "Veranstaltungsschlüssel zu lang."),
  ),
)

const dayRange = {
  fromDay: v.optional(organizerDashboardBerlinDaySchema),
  toDay: v.optional(organizerDashboardBerlinDaySchema),
}

/** Shared finance filters: every surface coerces through these same schemas. */
export const organizerDashboardFinanceOverviewFilterSchema = v.strictObject({
  orgId: id,
  eventKey,
  ...dayRange,
})

export const organizerDashboardSettlementFilterSchema = v.strictObject({
  orgId: id,
  eventKey: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "Ein Veranstaltungsschlüssel ist erforderlich."),
    v.maxLength(200, "Veranstaltungsschlüssel zu lang."),
  ),
})

export const organizerDashboardPayoutStatusSchema = v.picklist(
  ["vorgemerkt", "ausgezahlt"],
  "Bitte wähle einen Auszahlungsstatus.",
)

export type OrganizerDashboardPayoutStatus = v.InferOutput<typeof organizerDashboardPayoutStatusSchema>

export const organizerDashboardPayoutListFilterSchema = v.strictObject({
  orgId: id,
  eventKey,
  status: v.optional(organizerDashboardPayoutStatusSchema),
})

export const organizerDashboardPayoutRecordSchema = v.strictObject({
  orgId: id,
  eventKey: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "Ein Veranstaltungsschlüssel ist erforderlich."),
    v.maxLength(200, "Veranstaltungsschlüssel zu lang."),
  ),
  amountCents: v.pipe(
    v.number(),
    v.integer("Der Betrag muss in ganzen Cent angegeben werden."),
    v.minValue(1, "Betrag muss positiv sein"),
  ),
  note: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(500, "Notiz zu lang (höchstens 500 Zeichen)."))),
})
