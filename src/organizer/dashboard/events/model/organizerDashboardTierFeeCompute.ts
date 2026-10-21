import { dashFeeCompute } from "#src/dash/model/dashFeeCompute.ts"
import type { DashFee } from "#src/dash/model/dashFeeSchema.ts"

export function organizerDashboardTierFeeCompute(args: { priceCents: number; fee: DashFee }): number {
  if (args.priceCents === 0) return 0
  if (args.fee.payer === "veranstalter") return 0
  return dashFeeCompute({ priceCents: args.priceCents, fee: args.fee }).feeCents
}
