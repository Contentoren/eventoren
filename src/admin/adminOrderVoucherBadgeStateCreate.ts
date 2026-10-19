export interface AdminOrderVoucherSnapshot {
  readonly voucherId?: string
  readonly code: string
  readonly amountCents: number
}

export interface AdminOrderVoucherBadgeState {
  readonly tooltip: string
  readonly amountText: string
}

const euroFormat = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" })

export function adminOrderVoucherBadgeStateCreate(
  voucher: AdminOrderVoucherSnapshot | null | undefined,
): AdminOrderVoucherBadgeState | null {
  if (voucher === null || voucher === undefined) return null
  const amountText = euroFormat.format(voucher.amountCents / 100)
  return { tooltip: `${voucher.code} · ${amountText}`, amountText }
}

export type AdminOrderVoucherBadgeStateCreate = typeof adminOrderVoucherBadgeStateCreate
