import type { DashFee } from "./dashFeeSchema.ts"

export function dashFeeCompute(args: { priceCents: number; fee: DashFee }): {
  feeCents: number
  buyerPaysCents: number
  organizerGetsCents: number
} {
  const { priceCents, fee } = args
  if (priceCents === 0) return { feeCents: 0, buyerPaysCents: 0, organizerGetsCents: 0 }
  const feeCents = Math.round((priceCents * fee.percentBps) / 10000) + fee.fixedCents
  if (fee.payer === "kaeufer")
    return { feeCents, buyerPaysCents: priceCents + feeCents, organizerGetsCents: priceCents }
  return { feeCents, buyerPaysCents: priceCents, organizerGetsCents: priceCents - feeCents }
}
