import * as v from "valibot"
import {
  organizerDashboardPublicEventFilterSchema,
  organizerDashboardPublicProfileFilterSchema,
} from "../public/organizerDashboardPublicFilterSchema.ts"

/** Strict, credential-free transport wrappers around the canonical public fields. No token needed. */
export const organizerDashboardPublicInputSchemas = {
  publicProfileGet: v.strictObject({ ...organizerDashboardPublicProfileFilterSchema.entries }),
  publicEventGet: v.strictObject({ ...organizerDashboardPublicEventFilterSchema.entries }),
} as const
