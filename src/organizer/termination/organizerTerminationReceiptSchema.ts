import * as v from "valibot"
import { organizerTerminationRequestSchema } from "./organizerTerminationRequestSchema.ts"
export const organizerTerminationReceiptSchema = v.strictObject(
  v.pick(organizerTerminationRequestSchema.pipe[0], ["requestKey", "receiptToken"]).entries,
)
