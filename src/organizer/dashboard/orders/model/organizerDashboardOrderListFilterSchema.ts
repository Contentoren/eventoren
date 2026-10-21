import * as v from "valibot"

/** Statuses are the canonical historical order statuses; filtering is page-local. */
export const organizerDashboardOrderListFilterSchema = v.object({
  eventKey: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(160))),
  status: v.optional(
    v.picklist(["reserved", "checkout_created", "paid", "failed", "expired", "released", "paid_inventory_conflict"]),
  ),
  search: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(100))),
})
export type OrganizerDashboardOrderListFilter = v.InferOutput<typeof organizerDashboardOrderListFilterSchema>
