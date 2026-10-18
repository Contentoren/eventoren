import { dashCentsFormat } from "../../model/dashCentsFormat.ts"
import { dashDateFormat } from "../../model/dashDateFormat.ts"
import type { DashVoucher } from "../../model/dashVoucherSchema.ts"
import type { DashVoucherValidity } from "../../model/dashVoucherValiditySchema.ts"

export const dashVoucherValidityOptions: { value: DashVoucherValidity; label: string }[] = [
  { value: "1-jahr", label: "1 Jahr" },
  { value: "2-jahre", label: "2 Jahre" },
  { value: "3-jahre-jahresende", label: "3 Jahre zum Jahresende" },
  { value: "unbegrenzt", label: "Unbegrenzt" },
  { value: "datum", label: "Datum" },
]

export function dashVoucherValidityLabel(validity: DashVoucherValidity): string {
  return dashVoucherValidityOptions.find((option) => option.value === validity)?.label ?? validity
}

/** Ablauftext: „31.12.2029“ oder „Unbegrenzt“. */
export function dashVoucherExpiryText(voucher: Pick<DashVoucher, "expiresAt">): string {
  if (voucher.expiresAt === null) return "Unbegrenzt"
  return dashDateFormat(voucher.expiresAt, "datum")
}

/** Live-Zeile im Create-Sheet: „Gültig bis 31.12.2029“ / „Unbegrenzt gültig“. */
export function dashVoucherExpiryLine(expiresAt: string | null): string {
  if (expiresAt === null) return "Unbegrenzt gültig"
  return `Gültig bis ${dashDateFormat(expiresAt, "datum")}`
}

/** Empfängerzeile: Name oder E-Mail oder „—“. */
export function dashVoucherRecipientText(voucher: Pick<DashVoucher, "recipientName" | "recipientEmail">): string {
  const name = voucher.recipientName.trim()
  if (name.length > 0) return name
  const email = voucher.recipientEmail.trim()
  return email.length > 0 ? email : "—"
}

/** Eingelöster Betrag eines Gutscheins in Cent. */
export function dashVoucherRedeemedCents(voucher: Pick<DashVoucher, "initialCents" | "balanceCents">): number {
  return Math.max(voucher.initialCents - voucher.balanceCents, 0)
}

/** Kurztext für Einlösung: „Bestellnummer, Betrag, Datum“. */
export function dashVoucherRedemptionText(orderNumber: string, amountCents: number, at: string): string {
  return `${orderNumber} · ${dashCentsFormat(amountCents)} · ${dashDateFormat(at, "datum")}`
}
