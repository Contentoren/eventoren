import type { DashOrder } from "../../model/dashOrderSchema.ts"
import type { DashVoucher } from "../../model/dashVoucherSchema.ts"

export type DashVouchersStatusFilter = "alle" | "aktiv" | "eingeloest" | "abgelaufen" | "deaktiviert"

export type DashVoucherListRow = {
  voucher: DashVoucher
  orderNumberById: Map<string, string>
}

export type DashVoucherListResult = {
  rows: DashVoucherListRow[]
  counts: Record<DashVouchersStatusFilter, number>
  issuedCents: number
  redeemedCents: number
  openCents: number
}

function voucherMatchesQuery(voucher: DashVoucher, query: string): boolean {
  if (query.length === 0) return true
  const haystack = `${voucher.code} ${voucher.recipientName} ${voucher.recipientEmail}`.toLowerCase()
  return haystack.includes(query)
}

/** Filtert, zählt und summiert Gutscheine einer Org: KPIs Ausgegeben, Eingelöst, Offenes Guthaben. */
export function dashVoucherListFilter(input: {
  vouchers: DashVoucher[]
  orders: DashOrder[]
  q: string
  status: DashVouchersStatusFilter
}): DashVoucherListResult {
  const query = input.q.trim().toLowerCase()
  const orderNumberById = new Map(input.orders.map((order) => [order.id, order.number] as const))
  const issuedCents = input.vouchers.reduce((sum, voucher) => sum + voucher.initialCents, 0)
  const redeemedCents = input.vouchers.reduce(
    (sum, voucher) => sum + Math.max(voucher.initialCents - voucher.balanceCents, 0),
    0,
  )
  const openCents = input.vouchers
    .filter((voucher) => voucher.status === "aktiv")
    .reduce((sum, voucher) => sum + voucher.balanceCents, 0)
  const searched = input.vouchers.filter((voucher) => voucherMatchesQuery(voucher, query))
  const countFor = (status: DashVouchersStatusFilter): number =>
    status === "alle" ? searched.length : searched.filter((voucher) => voucher.status === status).length
  const counts: Record<DashVouchersStatusFilter, number> = {
    alle: countFor("alle"),
    aktiv: countFor("aktiv"),
    eingeloest: countFor("eingeloest"),
    abgelaufen: countFor("abgelaufen"),
    deaktiviert: countFor("deaktiviert"),
  }
  const rows = searched
    .filter((voucher) => (input.status === "alle" ? true : voucher.status === input.status))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map((voucher) => ({ voucher, orderNumberById }))
  return { rows, counts, issuedCents, redeemedCents, openCents }
}
