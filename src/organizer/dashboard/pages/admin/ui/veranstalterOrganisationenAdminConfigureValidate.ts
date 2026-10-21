import * as v from "valibot"
import { createResult, createResultError, type Result } from "#result"
import { adminEuroToCents } from "#src/admin/adminEuroToCents.ts"
import { organizerDashboardAdminConfigureSchema } from "#src/organizer/dashboard/admin/organizerDashboardAdminConfigureSchema.ts"

type ConfigureOutput = v.InferOutput<typeof organizerDashboardAdminConfigureSchema>

export type VeranstalterOrganisationenAdminConfigureRawInput = {
  readonly orgId: string
  readonly taxStatus: string
  readonly taxRateBps: string
  readonly feePercent: string
  readonly feeFixedEuro: string
  readonly feePayer: string
}

const percentPattern = /^(\d+)(?:[,.](\d{1,2}))?$/

function percentToBps(value: string): number | null {
  const match = percentPattern.exec(value.trim())
  if (!match) return null
  const whole = Number(match[1])
  const fraction = Number((match[2] ?? "").padEnd(2, "0"))
  const bps = whole * 100 + fraction
  return Number.isSafeInteger(bps) ? bps : null
}

/**
 * Pure admin tax+fee coercion: percent string maps to integer bps,
 * euro string maps to integer cents; tax status and the 7 %/19 % rate
 * stay independent (no status-to-rate pairing is assumed).
 */
export function veranstalterOrganisationenAdminConfigureValidate(
  raw: VeranstalterOrganisationenAdminConfigureRawInput,
): Result<ConfigureOutput> {
  const op = "veranstalterOrganisationenAdminConfigureValidate"
  const percentBps = percentToBps(raw.feePercent)
  if (percentBps === null) {
    return createResultError(op, "Prozentsatz muss eine Zahl von 0 bis 100 mit höchstens zwei Nachkommastellen sein")
  }
  const fixedCents = adminEuroToCents(raw.feeFixedEuro)
  if (fixedCents === null) {
    return createResultError(op, "Fixbetrag muss ein Eurobetrag mit höchstens zwei Nachkommastellen sein")
  }
  const parsed = v.safeParse(organizerDashboardAdminConfigureSchema, {
    orgId: raw.orgId,
    tax: { status: raw.taxStatus, defaultRateBps: Number(raw.taxRateBps) },
    fee: { percentBps, fixedCents, payer: raw.feePayer },
  })
  if (!parsed.success) return createResultError(op, v.summarize(parsed.issues))
  return createResult(parsed.output)
}
