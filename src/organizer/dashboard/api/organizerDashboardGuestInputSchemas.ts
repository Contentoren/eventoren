import * as v from "valibot"
import {
  organizerDashboardGuestQuotaSchema,
  organizerDashboardGuestSchema,
} from "../guests/organizerDashboardGuestSchema.ts"

// Transport IDs are nonempty strings. Convex validates canonical IDs and scope.
const id = v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty"))
const orgEvent = { orgId: id, eventKey: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(160)) }
const entrance = v.pipe(v.string(), v.trim(), v.minLength(1, "Cannot be empty"), v.maxLength(120, "Too long"))

/** Strict, credential-free transport wrappers around the canonical guest fields. */
export const organizerDashboardGuestInputSchemas = {
  quotaList: v.strictObject(orgEvent),
  quotaUpsert: v.strictObject({
    ...orgEvent,
    quotaId: v.optional(id),
    ...organizerDashboardGuestQuotaSchema.entries,
  }),
  quotaDelete: v.strictObject({ orgId: id, quotaId: id }),
  guestList: v.strictObject({ ...orgEvent, search: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(100))) }),
  guestUpsert: v.strictObject({
    ...orgEvent,
    guestId: v.optional(id),
    quotaId: v.optional(v.pipe(v.string(), v.maxLength(200))),
    ...organizerDashboardGuestSchema.entries,
  }),
  guestDelete: v.strictObject({ orgId: id, guestId: id }),
  guestTicketSend: v.strictObject({ orgId: id, guestId: id }),
  guestCheckIn: v.strictObject({ orgId: id, guestId: id, entrance }),
  guestCheckInUndo: v.strictObject({ orgId: id, guestId: id }),
} as const
