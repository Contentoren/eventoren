import * as v from "valibot"

export const organizerDashboardVoucherValiditySchema = v.picklist([
  "1-jahr",
  "2-jahre",
  "3-jahre-jahresende",
  "unbegrenzt",
  "datum",
])

export type OrganizerDashboardVoucherValidity = v.InferOutput<typeof organizerDashboardVoucherValiditySchema>

export const organizerDashboardVoucherStatusSchema = v.picklist(["aktiv", "eingeloest", "deaktiviert"])

export type OrganizerDashboardVoucherStatus = v.InferOutput<typeof organizerDashboardVoucherStatusSchema>

const voucherCode = v.pipe(v.string(), v.trim(), v.regex(/^[A-Z0-9-]{4,32}$/, "Code: 4–32 Zeichen aus A–Z, 0–9 und -"))

const berlinDay = v.pipe(v.string(), v.trim(), v.regex(/^\d{4}-\d{2}-\d{2}$/, "Tag als JJJJ-MM-TT"))

const cents = v.pipe(v.number(), v.integer("Betrag in ganzen Cent"), v.minValue(1))

/** Organization vouchers are only valid at their own organization. */
export const organizerDashboardVoucherSchema = v.strictObject({
  code: voucherCode,
  initialCents: cents,
  balanceCents: v.pipe(v.number(), v.integer(), v.minValue(0)),
  validity: organizerDashboardVoucherValiditySchema,
  expiresAt: v.optional(v.pipe(v.string(), v.isoTimestamp("Zeitpunkt als ISO-UTC erforderlich"))),
  status: organizerDashboardVoucherStatusSchema,
  recipientName: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(200))),
  recipientEmail: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(320))),
  message: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(1000))),
})

export type OrganizerDashboardVoucher = v.InferOutput<typeof organizerDashboardVoucherSchema>

export const organizerDashboardVoucherIssueSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
  code: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(64))),
  initialCents: cents,
  validity: organizerDashboardVoucherValiditySchema,
  customDate: v.optional(berlinDay),
  recipientName: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(200))),
  recipientEmail: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(320))),
  message: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(1000))),
})

export type OrganizerDashboardVoucherIssue = v.InferOutput<typeof organizerDashboardVoucherIssueSchema>

export const organizerDashboardVoucherRedeemSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
  code: v.pipe(v.string(), v.trim(), v.minLength(1, "Cannot be empty")),
  amountCents: cents,
  orderRef: v.pipe(v.string(), v.trim(), v.minLength(1, "Cannot be empty"), v.maxLength(200)),
})

export type OrganizerDashboardVoucherRedeem = v.InferOutput<typeof organizerDashboardVoucherRedeemSchema>

export const organizerDashboardVoucherDeactivateSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
  voucherId: v.pipe(v.string(), v.trim(), v.minLength(1, "Cannot be empty")),
})

export type OrganizerDashboardVoucherDeactivate = v.InferOutput<typeof organizerDashboardVoucherDeactivateSchema>

export const organizerDashboardVoucherListFilterSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
  status: v.optional(organizerDashboardVoucherStatusSchema),
})

export type OrganizerDashboardVoucherListFilter = v.InferOutput<typeof organizerDashboardVoucherListFilterSchema>
