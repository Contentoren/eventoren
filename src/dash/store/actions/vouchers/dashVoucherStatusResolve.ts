import type { DashVoucher } from "../../../model/dashVoucherSchema.ts"

/** Abgeleiteter Gutscheinstatus: abgelaufen, wenn expiresAt überschritten und noch Guthaben offen ist. */
export function dashVoucherStatusResolve(voucher: DashVoucher, now: Date): DashVoucher["status"] {
  if (voucher.status === "deaktiviert") return "deaktiviert"
  if (voucher.balanceCents <= 0) return "eingeloest"
  if (voucher.expiresAt !== null && Date.parse(voucher.expiresAt) < now.getTime()) return "abgelaufen"
  return "aktiv"
}
