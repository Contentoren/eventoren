import * as v from "valibot"
import { customerAccountProfileUpdateSchema } from "#src/customer/account/model/customerAccountProfileUpdateSchema.ts"

// Transport IDs are nonempty strings. Convex validates canonical IDs and ownership.
const id = v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty"))
const page = {
  numItems: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(50)), 25),
  cursor: v.optional(v.nullable(v.string())),
  endCursor: v.optional(v.nullable(v.string())),
}

/** Strict, credential-free transport wrappers for the customer account. No org scope: owner-bound. */
export const customerAccountInputSchemas = {
  accountTicketList: v.strictObject(page),
  accountOrderList: v.strictObject(page),
  accountOrderGet: v.strictObject({ orderId: id }),
  accountProfileGet: v.strictObject({}),
  accountProfileUpdate: v.strictObject({ ...customerAccountProfileUpdateSchema.entries }),
} as const
