import * as v from "valibot"

export const organizerDashboardVoucherValiditySchema = v.picklist(
  ["1-jahr", "2-jahre", "3-jahre-jahresende", "unbegrenzt", "datum"],
  "Bitte wähle eine Gültigkeit.",
)

export type OrganizerDashboardVoucherValidity = v.InferOutput<typeof organizerDashboardVoucherValiditySchema>

export const organizerDashboardVoucherStatusSchema = v.picklist(["aktiv", "eingeloest", "deaktiviert"])

export type OrganizerDashboardVoucherStatus = v.InferOutput<typeof organizerDashboardVoucherStatusSchema>

const voucherCode = v.pipe(v.string(), v.trim(), v.regex(/^[A-Z0-9-]{4,32}$/, "Code: 4–32 Zeichen aus A–Z, 0–9 und -"))

const berlinDay = v.pipe(v.string(), v.trim(), v.regex(/^\d{4}-\d{2}-\d{2}$/, "Tag als JJJJ-MM-TT"))

const cents = v.pipe(
  v.number(),
  v.integer("Der Betrag muss in ganzen Cent angegeben werden."),
  v.minValue(1, "Der Betrag muss mindestens 1 Cent sein."),
)

/** Organization vouchers are only valid at their own organization. */
export const organizerDashboardVoucherSchema = v.strictObject({
  code: voucherCode,
  initialCents: cents,
  balanceCents: v.pipe(
    v.number(),
    v.integer("Der Wert muss eine ganze Zahl sein."),
    v.minValue(0, "Der Wert darf nicht negativ sein."),
  ),
  validity: organizerDashboardVoucherValiditySchema,
  expiresAt: v.optional(v.pipe(v.string(), v.isoTimestamp("Bitte gib einen gültigen Zeitpunkt an (Europe/Berlin)."))),
  status: organizerDashboardVoucherStatusSchema,
  recipientName: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(200, "Name zu lang (höchstens 200 Zeichen)."))),
  recipientEmail: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(320, "E-Mail zu lang (höchstens 320 Zeichen)."))),
  message: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(1000, "Nachricht zu lang (höchstens 1000 Zeichen)."))),
})

export type OrganizerDashboardVoucher = v.InferOutput<typeof organizerDashboardVoucherSchema>

export const organizerDashboardVoucherIssueSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Bitte wähle zuerst eine Organisation.")),
  code: v.optional(
    v.pipe(
      v.string(),
      v.trim(),
      v.minLength(1, "Bitte gib einen Code an."),
      v.maxLength(64, "Code zu lang (höchstens 64 Zeichen)."),
    ),
  ),
  initialCents: cents,
  validity: organizerDashboardVoucherValiditySchema,
  customDate: v.optional(berlinDay),
  recipientName: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(200, "Name zu lang (höchstens 200 Zeichen)."))),
  recipientEmail: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(320, "E-Mail zu lang (höchstens 320 Zeichen)."))),
  message: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(1000, "Nachricht zu lang (höchstens 1000 Zeichen)."))),
})

export type OrganizerDashboardVoucherIssue = v.InferOutput<typeof organizerDashboardVoucherIssueSchema>

export const organizerDashboardVoucherRedeemSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Bitte wähle zuerst eine Organisation.")),
  code: v.pipe(v.string(), v.trim(), v.minLength(1, "Bitte ausfüllen, darf nicht leer sein.")),
  amountCents: cents,
  orderRef: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "Bitte gib eine Bestellreferenz an."),
    v.maxLength(200, "Bestellreferenz zu lang."),
  ),
})

export type OrganizerDashboardVoucherRedeem = v.InferOutput<typeof organizerDashboardVoucherRedeemSchema>

export const organizerDashboardVoucherDeactivateSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Bitte wähle zuerst eine Organisation.")),
  voucherId: v.pipe(v.string(), v.trim(), v.minLength(1, "Bitte ausfüllen, darf nicht leer sein.")),
})

export type OrganizerDashboardVoucherDeactivate = v.InferOutput<typeof organizerDashboardVoucherDeactivateSchema>

export const organizerDashboardVoucherListFilterSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Bitte wähle zuerst eine Organisation.")),
  status: v.optional(organizerDashboardVoucherStatusSchema),
})

export type OrganizerDashboardVoucherListFilter = v.InferOutput<typeof organizerDashboardVoucherListFilterSchema>
