import * as v from "valibot"

const veranstalterDashboardEventCreateSearchSchema = v.object({
  org: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(100))),
  entwurf: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(200))),
  tier: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(200))),
  step: v.optional(v.union([v.number(), v.string()])),
})

export type VeranstalterDashboardEventCreateSearch = {
  readonly org: string | undefined
  readonly step: 0 | 1 | 2
  readonly entwurf: string | undefined
  readonly tier: string | undefined
}

function veranstalterDashboardEventCreateStepNormalize(value: number | string | undefined): 0 | 1 | 2 {
  if (value === undefined) return 0
  const numeric = typeof value === "number" ? value : Number(value)
  if (numeric === 1) return 1
  if (numeric === 2) return 2
  return 0
}

/**
 * Parses the wizard URL query. `step` arrives as a string from the router and
 * is coerced to 0|1|2; unknown values fall back to step 0. Draft and tier keys
 * stay stable across back navigation and reload so a resumed wizard never
 * duplicates the server draft.
 */
export function veranstalterDashboardEventCreateSearchParse(input: unknown): VeranstalterDashboardEventCreateSearch {
  const parsed = v.safeParse(veranstalterDashboardEventCreateSearchSchema, input)
  if (!parsed.success) return { org: undefined, step: 0, entwurf: undefined, tier: undefined }
  return {
    org: parsed.output.org,
    step: veranstalterDashboardEventCreateStepNormalize(parsed.output.step),
    entwurf: parsed.output.entwurf,
    tier: parsed.output.tier,
  }
}
