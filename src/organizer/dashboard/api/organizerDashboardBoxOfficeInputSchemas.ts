import * as v from "valibot"
import { organizerDashboardBoxOfficeSaleCompleteSchema } from "../boxoffice/model/organizerDashboardBoxOfficeSaleCompleteSchema.ts"
import { organizerDashboardBoxOfficeSaleCreateSchema } from "../boxoffice/model/organizerDashboardBoxOfficeSaleCreateSchema.ts"
import { organizerDashboardBoxOfficeSaleTestPaySchema } from "../boxoffice/model/organizerDashboardBoxOfficeSaleTestPaySchema.ts"

// Transport IDs are nonempty strings. Convex validates canonical IDs and scope.
const id = v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty"))

/** Strict, credential-free transport wrappers around the canonical box-office fields. */
export const organizerDashboardBoxOfficeInputSchemas = {
  boxofficeSaleCreate: v.strictObject({
    orgId: id,
    ...organizerDashboardBoxOfficeSaleCreateSchema.entries,
  }),
  boxofficeSaleGet: v.strictObject({ orgId: id, saleId: id }),
  boxofficeSaleList: v.strictObject({
    orgId: id,
    eventKey: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200)),
  }),
  boxofficeSaleCancel: v.strictObject({ orgId: id, saleId: id }),
  boxofficeSaleTestPay: v.strictObject({
    orgId: id,
    ...organizerDashboardBoxOfficeSaleTestPaySchema.entries,
  }),
  boxofficeSaleComplete: v.strictObject({
    orgId: id,
    ...organizerDashboardBoxOfficeSaleCompleteSchema.entries,
  }),
} as const
