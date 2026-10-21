import * as v from "valibot"
import { organizerDashboardOrderListFilterSchema } from "../../orders/model/organizerDashboardOrderListFilterSchema.ts"

const schema = v.object({
  org: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(100))),
  q: organizerDashboardOrderListFilterSchema.entries.search,
  status: organizerDashboardOrderListFilterSchema.entries.status,
  order: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(100))),
  sheet: v.optional(v.literal("order")),
  cursor: v.optional(v.pipe(v.string(), v.maxLength(32768))),
})
export function veranstalterDashboardOrdersSearchParse(input: unknown) {
  const parsed = v.safeParse(schema, input)
  return parsed.success ? parsed.output : {}
}
export type VeranstalterDashboardOrdersSearch = v.InferOutput<typeof schema>
