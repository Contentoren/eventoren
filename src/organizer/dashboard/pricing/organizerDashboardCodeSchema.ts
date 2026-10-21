import * as v from "valibot"

export const organizerDashboardCodeKindSchema = v.picklist(["rabatt", "zugang"])

export type OrganizerDashboardCodeKind = v.InferOutput<typeof organizerDashboardCodeKindSchema>

export const organizerDashboardCodeDiscountTypeSchema = v.picklist(["prozent", "betrag"])

export type OrganizerDashboardCodeDiscountType = v.InferOutput<typeof organizerDashboardCodeDiscountTypeSchema>

const codePattern = /^[A-Z0-9-]{4,32}$/

/** Stored codes are already normalized: uppercase letters, digits and dashes. */
export const organizerDashboardCodeValueSchema = v.pipe(
  v.string(),
  v.trim(),
  v.regex(codePattern, "Code: 4–32 Zeichen aus A–Z, 0–9 und -"),
)

const eventKey = v.pipe(v.string(), v.trim(), v.minLength(1, "Cannot be empty"), v.maxLength(200))

const isoInstant = v.pipe(v.string(), v.isoTimestamp("Zeitpunkt als ISO-UTC erforderlich"))

const tierKeys = v.pipe(
  v.array(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200))),
  v.maxLength(50, "Maximal 50 Ticketarten"),
)

/** Empty `tierKeys` means all ticket types; access codes must name hidden tiers. */
export const organizerDashboardCodeSchema = v.strictObject({
  eventKey,
  kind: organizerDashboardCodeKindSchema,
  code: organizerDashboardCodeValueSchema,
  discountType: v.optional(organizerDashboardCodeDiscountTypeSchema),
  discountValue: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  tierKeys,
  maxTickets: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  usedTickets: v.pipe(v.number(), v.integer(), v.minValue(0)),
  validFrom: v.optional(isoInstant),
  validUntil: v.optional(isoInstant),
  active: v.boolean(),
  note: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(500))),
})

export type OrganizerDashboardCode = v.InferOutput<typeof organizerDashboardCodeSchema>

export const organizerDashboardCodeCreateSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
  eventKey,
  kind: organizerDashboardCodeKindSchema,
  code: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(64))),
  discountType: v.optional(organizerDashboardCodeDiscountTypeSchema),
  discountValue: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  tierKeys: v.optional(tierKeys),
  maxTickets: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  validFrom: v.optional(isoInstant),
  validUntil: v.optional(isoInstant),
  note: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(500))),
})

export type OrganizerDashboardCodeCreate = v.InferOutput<typeof organizerDashboardCodeCreateSchema>

export const organizerDashboardCodeBulkCreateSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
  eventKey,
  kind: organizerDashboardCodeKindSchema,
  prefix: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(12))),
  count: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(500, "Maximal 500 Codes je Lauf")),
  discountType: v.optional(organizerDashboardCodeDiscountTypeSchema),
  discountValue: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  tierKeys: v.optional(tierKeys),
  maxTickets: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  validFrom: v.optional(isoInstant),
  validUntil: v.optional(isoInstant),
  note: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(500))),
})

export type OrganizerDashboardCodeBulkCreate = v.InferOutput<typeof organizerDashboardCodeBulkCreateSchema>

export const organizerDashboardCodeUpdateSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
  codeId: v.pipe(v.string(), v.trim(), v.minLength(1, "Cannot be empty")),
  active: v.optional(v.boolean()),
  maxTickets: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  validFrom: v.optional(v.nullable(isoInstant)),
  validUntil: v.optional(v.nullable(isoInstant)),
  note: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(500)))),
})

export type OrganizerDashboardCodeUpdate = v.InferOutput<typeof organizerDashboardCodeUpdateSchema>

export const organizerDashboardCodeArchiveSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
  codeId: v.pipe(v.string(), v.trim(), v.minLength(1, "Cannot be empty")),
})

export type OrganizerDashboardCodeArchive = v.InferOutput<typeof organizerDashboardCodeArchiveSchema>

export const organizerDashboardCodeListFilterSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
  eventKey,
  kind: v.optional(organizerDashboardCodeKindSchema),
})

export type OrganizerDashboardCodeListFilter = v.InferOutput<typeof organizerDashboardCodeListFilterSchema>
