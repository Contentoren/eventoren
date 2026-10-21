import * as v from "valibot"

const veranstalterDashboardEventDetailConfirmSchema = v.picklist(["veranstaltung-archiv", "tarif-archiv"])

export type VeranstalterDashboardEventDetailConfirm = v.InferOutput<
  typeof veranstalterDashboardEventDetailConfirmSchema
>

const veranstalterDashboardEventDetailSearchSchema = v.object({
  org: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(100))),
  tier: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(200))),
  bestaetigen: v.optional(veranstalterDashboardEventDetailConfirmSchema),
})

export type VeranstalterDashboardEventDetailSearch = {
  readonly org: string | undefined
  readonly tier: string | undefined
  readonly bestaetigen: VeranstalterDashboardEventDetailConfirm | undefined
}

/** Detail URL state: organization, open tier sheet, and open archive confirmation. */
export function veranstalterDashboardEventDetailSearchParse(input: unknown): VeranstalterDashboardEventDetailSearch {
  const parsed = v.safeParse(veranstalterDashboardEventDetailSearchSchema, input)
  if (!parsed.success) return { org: undefined, tier: undefined, bestaetigen: undefined }
  return { org: parsed.output.org, tier: parsed.output.tier, bestaetigen: parsed.output.bestaetigen }
}
