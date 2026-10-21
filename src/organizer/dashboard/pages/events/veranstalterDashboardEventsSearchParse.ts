import * as v from "valibot"

const veranstalterDashboardEventsSearchSchema = v.object({
  org: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(100))),
  q: v.optional(v.pipe(v.string(), v.maxLength(200))),
  filter: v.optional(v.picklist(["current", "draft", "past"])),
})

export type VeranstalterDashboardEventsSearch = {
  readonly org: string | undefined
  readonly q: string | undefined
  readonly filter: "current" | "draft" | "past"
}

export function veranstalterDashboardEventsSearchParse(input: unknown): VeranstalterDashboardEventsSearch {
  const parsed = v.safeParse(veranstalterDashboardEventsSearchSchema, input)
  if (!parsed.success) return { org: undefined, q: undefined, filter: "current" }
  return {
    org: parsed.output.org,
    q: parsed.output.q?.trim() ? parsed.output.q.trim() : undefined,
    filter: parsed.output.filter ?? "current",
  }
}
