import { dashCentsFormat } from "../../../model/dashCentsFormat.ts"
import type { DashOrderVoucherUse } from "../../../model/dashOrderVoucherUseSchema.ts"
import type { DashVoucher } from "../../../model/dashVoucherSchema.ts"
import { dashVoucherStatusResolve } from "../../../store/actions/vouchers/dashVoucherStatusResolve.ts"
import { dashStatusPillResolve } from "../../../ui/status/dashStatusPillResolve.ts"

export function dashOrderVoucherBadgeStateCreate(inputs: {
  voucher: () => DashOrderVoucherUse | null
  vouchers: () => DashVoucher[]
  now: () => Date
}) {
  const detail = () => {
    const snapshot = inputs.voucher()
    if (snapshot === null) return null
    return inputs.vouchers().find((entry) => entry.id === snapshot.voucherId) ?? null
  }

  const hasVoucher = () => inputs.voucher() !== null

  const code = () => inputs.voucher()?.code ?? ""

  const amountText = () => {
    const snapshot = inputs.voucher()
    if (snapshot === null) return ""
    return dashCentsFormat(snapshot.amountCents)
  }

  const tooltip = () => {
    const snapshot = inputs.voucher()
    if (snapshot === null) return ""
    return `${snapshot.code} · ${dashCentsFormat(snapshot.amountCents)}`
  }

  const status = () => {
    const found = detail()
    if (found === null) return null
    return dashVoucherStatusResolve(found, inputs.now())
  }

  const statusLabel = () => {
    const value = status()
    if (value === null) return null
    return dashStatusPillResolve("voucher", value).label
  }

  const balanceText = () => {
    const found = detail()
    if (found === null) return null
    return dashCentsFormat(found.balanceCents)
  }

  const linkSearch = () => {
    const snapshot = inputs.voucher()
    if (snapshot === null) return null
    return { gutschein: snapshot.voucherId }
  }

  return { detail, hasVoucher, code, amountText, tooltip, status, statusLabel, balanceText, linkSearch }
}

export type DashOrderVoucherBadgeState = ReturnType<typeof dashOrderVoucherBadgeStateCreate>
