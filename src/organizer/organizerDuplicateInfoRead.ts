import * as a from "valibot"
import type { OrganizerDuplicateInfo } from "./OrganizerDuplicateInfo.ts"

const organizerDuplicateInfoSchema = a.object({
  ticketNumber: a.string(),
  previousCheckedInAt: a.string(),
  previousOperator: a.string(),
  participantName: a.string(),
  buyerName: a.string(),
  buyerEmail: a.string(),
  elapsedMilliseconds: a.nullable(a.number()),
})

export function organizerDuplicateInfoRead(value: string | undefined): OrganizerDuplicateInfo | null {
  if (!value) return null
  const parsed = a.safeParse(a.pipe(a.string(), a.parseJson(), organizerDuplicateInfoSchema), value)
  if (!parsed.success) return null
  return parsed.output
}
