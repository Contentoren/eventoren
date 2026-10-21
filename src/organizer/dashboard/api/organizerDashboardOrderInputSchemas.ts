import * as v from "valibot"
import { organizerDashboardOrderBuyerContactSchema } from "../orders/model/organizerDashboardOrderBuyerContactSchema.ts"
import { organizerDashboardOrderListFilterSchema } from "../orders/model/organizerDashboardOrderListFilterSchema.ts"
import { organizerDashboardOrderNoteTextSchema } from "../orders/model/organizerDashboardOrderNoteTextSchema.ts"
import { organizerDashboardOrderParticipantListFilterSchema } from "../orders/model/organizerDashboardOrderParticipantListFilterSchema.ts"
import { organizerDashboardOrderParticipantUpdateSchema } from "../orders/model/organizerDashboardOrderParticipantUpdateSchema.ts"

// Transport IDs are nonempty strings. Convex validates canonical IDs and scope;
// no interface-layer permission check may exclude entry-only participant readers.
const id = v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty"))
const order = { orgId: id, orderId: id }
const page = {
  numItems: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(50)), 25),
  cursor: v.optional(v.nullable(v.string())),
  endCursor: v.optional(v.nullable(v.string())),
}

/** Strict, credential-free transport wrappers around the canonical order fields. */
export const organizerDashboardOrderInputSchemas = {
  orderList: v.strictObject({ orgId: id, ...organizerDashboardOrderListFilterSchema.entries, ...page }),
  orderGet: v.strictObject(order),
  orderNoteCreate: v.strictObject({ ...order, text: organizerDashboardOrderNoteTextSchema }),
  orderNoteDelete: v.strictObject({ ...order, noteId: id }),
  orderBuyerContactUpdate: v.strictObject({ ...order, ...organizerDashboardOrderBuyerContactSchema.entries }),
  orderParticipantUpdate: v.strictObject({
    ...order,
    ticketId: id,
    ...organizerDashboardOrderParticipantUpdateSchema.entries,
  }),
  orderParticipantList: v.strictObject({
    orgId: id,
    ...organizerDashboardOrderParticipantListFilterSchema.entries,
    ...page,
  }),
} as const
