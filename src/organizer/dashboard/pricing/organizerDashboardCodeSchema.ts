import * as v from "valibot"

export const organizerDashboardCodeKindSchema = v.picklist(
  ["rabatt", "zugang"],
  "Bitte wähle eine Code-Art: Rabatt oder Zugang.",
)

export type OrganizerDashboardCodeKind = v.InferOutput<typeof organizerDashboardCodeKindSchema>

export const organizerDashboardCodeDiscountTypeSchema = v.picklist(
  ["prozent", "betrag"],
  "Bitte wähle eine Rabattart: Prozent oder Betrag.",
)

export type OrganizerDashboardCodeDiscountType = v.InferOutput<typeof organizerDashboardCodeDiscountTypeSchema>

const codePattern = /^[A-Z0-9-]{4,32}$/

/** Stored codes are already normalized: uppercase letters, digits and dashes. */
export const organizerDashboardCodeValueSchema = v.pipe(
  v.string(),
  v.trim(),
  v.regex(codePattern, "Code: 4–32 Zeichen aus A–Z, 0–9 und -"),
)

const eventKey = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1, "Bitte ausfüllen, darf nicht leer sein."),
  v.maxLength(200, "Höchstens 200 Zeichen erlaubt."),
)

const isoInstant = v.pipe(v.string(), v.isoTimestamp("Bitte gib einen gültigen Zeitpunkt an (Europe/Berlin)."))

const tierKeys = v.pipe(
  v.array(
    v.pipe(
      v.string(),
      v.trim(),
      v.minLength(1, "Bitte gib eine Ticketart an."),
      v.maxLength(200, "Ticketart zu lang."),
    ),
  ),
  v.maxLength(50, "Maximal 50 Ticketarten"),
)

/** Empty `tierKeys` means all ticket types; access codes must name hidden tiers. */
export const organizerDashboardCodeSchema = v.strictObject({
  eventKey,
  kind: organizerDashboardCodeKindSchema,
  code: organizerDashboardCodeValueSchema,
  discountType: v.optional(organizerDashboardCodeDiscountTypeSchema),
  discountValue: v.optional(
    v.pipe(
      v.number(),
      v.integer("Der Wert muss eine ganze Zahl sein."),
      v.minValue(1, "Der Wert muss mindestens 1 sein."),
    ),
  ),
  tierKeys,
  maxTickets: v.optional(
    v.pipe(
      v.number(),
      v.integer("Der Wert muss eine ganze Zahl sein."),
      v.minValue(1, "Der Wert muss mindestens 1 sein."),
    ),
  ),
  usedTickets: v.pipe(
    v.number(),
    v.integer("Der Wert muss eine ganze Zahl sein."),
    v.minValue(0, "Der Wert darf nicht negativ sein."),
  ),
  validFrom: v.optional(isoInstant),
  validUntil: v.optional(isoInstant),
  active: v.boolean(),
  note: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(500, "Notiz zu lang (höchstens 500 Zeichen)."))),
})

export type OrganizerDashboardCode = v.InferOutput<typeof organizerDashboardCodeSchema>

export const organizerDashboardCodeCreateSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Bitte wähle zuerst eine Organisation.")),
  eventKey,
  kind: organizerDashboardCodeKindSchema,
  code: v.optional(
    v.pipe(
      v.string(),
      v.trim(),
      v.minLength(1, "Bitte gib einen Code an."),
      v.maxLength(64, "Code zu lang (höchstens 64 Zeichen)."),
    ),
  ),
  discountType: v.optional(organizerDashboardCodeDiscountTypeSchema),
  discountValue: v.optional(
    v.pipe(
      v.number(),
      v.integer("Der Wert muss eine ganze Zahl sein."),
      v.minValue(1, "Der Wert muss mindestens 1 sein."),
    ),
  ),
  tierKeys: v.optional(tierKeys),
  maxTickets: v.optional(
    v.pipe(
      v.number(),
      v.integer("Der Wert muss eine ganze Zahl sein."),
      v.minValue(1, "Der Wert muss mindestens 1 sein."),
    ),
  ),
  validFrom: v.optional(isoInstant),
  validUntil: v.optional(isoInstant),
  note: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(500, "Notiz zu lang (höchstens 500 Zeichen)."))),
})

export type OrganizerDashboardCodeCreate = v.InferOutput<typeof organizerDashboardCodeCreateSchema>

export const organizerDashboardCodeBulkCreateSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Bitte wähle zuerst eine Organisation.")),
  eventKey,
  kind: organizerDashboardCodeKindSchema,
  prefix: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(12, "Präfix zu lang (höchstens 12 Zeichen)."))),
  count: v.pipe(
    v.number(),
    v.integer("Die Anzahl muss eine ganze Zahl sein."),
    v.minValue(1, "Mindestens 1 Code erforderlich."),
    v.maxValue(500, "Maximal 500 Codes je Lauf"),
  ),
  discountType: v.optional(organizerDashboardCodeDiscountTypeSchema),
  discountValue: v.optional(
    v.pipe(
      v.number(),
      v.integer("Der Wert muss eine ganze Zahl sein."),
      v.minValue(1, "Der Wert muss mindestens 1 sein."),
    ),
  ),
  tierKeys: v.optional(tierKeys),
  maxTickets: v.optional(
    v.pipe(
      v.number(),
      v.integer("Der Wert muss eine ganze Zahl sein."),
      v.minValue(1, "Der Wert muss mindestens 1 sein."),
    ),
  ),
  validFrom: v.optional(isoInstant),
  validUntil: v.optional(isoInstant),
  note: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(500, "Notiz zu lang (höchstens 500 Zeichen)."))),
})

export type OrganizerDashboardCodeBulkCreate = v.InferOutput<typeof organizerDashboardCodeBulkCreateSchema>

export const organizerDashboardCodeUpdateSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Bitte wähle zuerst eine Organisation.")),
  codeId: v.pipe(v.string(), v.trim(), v.minLength(1, "Bitte ausfüllen, darf nicht leer sein.")),
  active: v.optional(v.boolean()),
  maxTickets: v.optional(
    v.pipe(
      v.number(),
      v.integer("Der Wert muss eine ganze Zahl sein."),
      v.minValue(1, "Der Wert muss mindestens 1 sein."),
    ),
  ),
  validFrom: v.optional(v.nullable(isoInstant)),
  validUntil: v.optional(v.nullable(isoInstant)),
  note: v.optional(
    v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(500, "Notiz zu lang (höchstens 500 Zeichen)."))),
  ),
})

export type OrganizerDashboardCodeUpdate = v.InferOutput<typeof organizerDashboardCodeUpdateSchema>

export const organizerDashboardCodeArchiveSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Bitte wähle zuerst eine Organisation.")),
  codeId: v.pipe(v.string(), v.trim(), v.minLength(1, "Bitte ausfüllen, darf nicht leer sein.")),
})

export type OrganizerDashboardCodeArchive = v.InferOutput<typeof organizerDashboardCodeArchiveSchema>

export const organizerDashboardCodeListFilterSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Bitte wähle zuerst eine Organisation.")),
  eventKey,
  kind: v.optional(organizerDashboardCodeKindSchema),
})

export type OrganizerDashboardCodeListFilter = v.InferOutput<typeof organizerDashboardCodeListFilterSchema>
