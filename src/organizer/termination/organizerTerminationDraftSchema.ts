import * as v from "valibot"
import { organizerTerminationRequestSchema } from "./organizerTerminationRequestSchema.ts"

// Drafts may be incomplete/contain an unfinished email; submission always uses the full schema.
const entries = organizerTerminationRequestSchema.pipe[0].entries
export const organizerTerminationDraftSchema = v.strictObject({
  ...entries,
  legalName: v.pipe(v.string(), v.maxLength(200)),
  email: v.pipe(v.string(), v.maxLength(254)),
  contractReference: v.pipe(v.string(), v.maxLength(500)),
})
