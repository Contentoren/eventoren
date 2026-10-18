import type { DashTaxStatus } from "./dashTaxStatusSchema.ts"

export function dashTaxCompute(args: { grossCents: number; rateBps: number; status: DashTaxStatus }): {
  netCents: number
  taxCents: number
} {
  const { grossCents, rateBps, status } = args
  if (status === "klein") return { netCents: grossCents, taxCents: 0 }
  const taxCents = Math.round((grossCents * rateBps) / (10000 + rateBps))
  return { netCents: grossCents - taxCents, taxCents }
}
