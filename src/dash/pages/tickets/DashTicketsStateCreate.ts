import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { DashTicketChannel } from "../../model/dashTicketChannelSchema.ts"

export type DashTicketsState = {
  dragId: ReturnType<typeof createSignalObject<string | null>>
  deleteId: ReturnType<typeof createSignalObject<string | null>>
}

/** Listen-State der Ticketseite: Drag-Sortierung und Lösch-Dialog. */
export function DashTicketsStateCreate(): DashTicketsState {
  return {
    dragId: createSignalObject<string | null>(null),
    deleteId: createSignalObject<string | null>(null),
  }
}
