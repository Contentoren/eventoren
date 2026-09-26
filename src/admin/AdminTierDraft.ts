import type { EventAdmissionRange } from "../events/EventAdmissionRange.ts"

export type AdminTierDraft = {
  tierKey: string
  name: string
  description: string
  startsAt: string
  doorsAt: string
  additionalDoorsAt: EventAdmissionRange[]
  endsAt: string
  priceCents: string
  feeCents: string
  capacity: string
  sortOrder: string
}
