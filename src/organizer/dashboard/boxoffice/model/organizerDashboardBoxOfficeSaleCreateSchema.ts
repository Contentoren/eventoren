import * as v from "valibot"

/** Organizer-created box-office sale (Kassenvorgang). Price/contingent set by organizer. */
export const organizerDashboardBoxOfficeSaleCreateSchema = v.strictObject({
  eventKey: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "Ein Veranstaltungsschlüssel ist erforderlich."),
    v.maxLength(200, "Veranstaltungsschlüssel zu lang."),
  ),
  tierKey: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "Bitte gib eine Ticketart an."),
    v.maxLength(200, "Ticketart zu lang."),
  ),
  quantity: v.pipe(
    v.number(),
    v.integer("Die Anzahl muss eine ganze Zahl sein."),
    v.minValue(1, "Mindestens 1 Ticket erforderlich."),
    v.maxValue(50, "Höchstens 50 Tickets pro Vorgang."),
  ),
  unitPriceCents: v.optional(
    v.pipe(
      v.number(),
      v.integer("Der Preis muss in ganzen Cent angegeben werden."),
      v.minValue(0, "Der Preis darf nicht negativ sein."),
    ),
  ),
  buyerEmail: v.optional(
    v.pipe(
      v.string(),
      v.trim(),
      v.maxLength(320, "E-Mail zu lang."),
      v.email("Bitte gib eine gültige E-Mail-Adresse ein."),
    ),
  ),
  /** Explicit demo-harness marker: only test sales accept the simulated device payment. */
  testHarness: v.optional(v.boolean()),
})

export type OrganizerDashboardBoxOfficeSaleCreate = v.InferOutput<typeof organizerDashboardBoxOfficeSaleCreateSchema>
