import * as v from "valibot"
import { organizerDashboardExportFilterSchema } from "../exports/organizerDashboardExportFilterSchema.ts"

const page = {
  numItems: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(50)), 25),
  cursor: v.optional(v.nullable(v.string())),
  endCursor: v.optional(v.nullable(v.string())),
}

/** Strict, credential-free transport wrappers around the canonical export fields. */
export const organizerDashboardExportInputSchemas = {
  exportList: v.strictObject({
    ...organizerDashboardExportFilterSchema.entries,
    search: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(100))),
    ...page,
  }),
} as const
