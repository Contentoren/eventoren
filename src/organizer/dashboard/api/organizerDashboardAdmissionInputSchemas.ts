import * as v from "valibot"
import { organizerDashboardAdmissionCheckInSchema } from "../admission/model/organizerDashboardAdmissionCheckInSchema.ts"
import { organizerDashboardAdmissionScannerLinkSchema } from "../admission/model/organizerDashboardAdmissionScannerLinkSchema.ts"

// Transport IDs are nonempty strings. Convex validates canonical IDs and scope.
const id = v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty"))
const scope = { orgId: id, eventKey: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200)) }
const page = {
  numItems: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(50)), 25),
  cursor: v.optional(v.nullable(v.string())),
  endCursor: v.optional(v.nullable(v.string())),
}

/** Strict, credential-free transport wrappers around the canonical admission fields. */
export const organizerDashboardAdmissionInputSchemas = {
  admissionStats: v.strictObject(scope),
  admissionCheckin: v.strictObject({
    ...scope,
    ...organizerDashboardAdmissionCheckInSchema.entries,
    ticketId: v.optional(id),
  }),
  admissionCheckinRevoke: v.strictObject({
    ...scope,
    ...organizerDashboardAdmissionCheckInSchema.entries,
    ticketId: v.optional(id),
  }),
  admissionScannerLinkList: v.strictObject(scope),
  admissionScannerLinkCreate: v.strictObject({
    orgId: id,
    ...organizerDashboardAdmissionScannerLinkSchema.entries,
    expiresAt: v.pipe(v.number(), v.integer(), v.minValue(1)),
  }),
  admissionScannerLinkRevoke: v.strictObject({ orgId: id, linkId: id }),
} as const
