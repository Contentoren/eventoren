import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { DashTicketType } from "../../model/dashTicketTypeSchema.ts"

export type DashBoxOfficeState = {
  editingId: ReturnType<typeof createSignalObject<string | null>>
  name: ReturnType<typeof createSignalObject<string>>
  priceCents: ReturnType<typeof createSignalObject<number | null>>
  capacity: ReturnType<typeof createSignalObject<string>>
  posterBusy: ReturnType<typeof createSignalObject<boolean>>
}

export type DashBoxOfficeRow = {
  type: DashTicketType
  priceCents: number
  sold: number
  remaining: number
}

/** State der Abendkassen-Seite: Inline-Preis-Editor plus Poster-Download-Flag. */
export function DashBoxOfficeStateCreate(): DashBoxOfficeState {
  return {
    editingId: createSignalObject<string | null>(null),
    name: createSignalObject(""),
    priceCents: createSignalObject<number | null>(null),
    capacity: createSignalObject(""),
    posterBusy: createSignalObject(false),
  }
}
