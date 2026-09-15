import type { Accessor } from "solid-js"
import type { EventItem } from "../events/EventItem.ts"
import type { EventTicketTier } from "../events/EventTicketTier.ts"
import type { AdminEventDraft } from "./AdminEventDraft.ts"
import type { AdminTierDraft } from "./AdminTierDraft.ts"

export type AdminCatalogPageState = {
  events: Accessor<readonly EventItem[]>
  selectedEvent: Accessor<EventItem | undefined>
  selectedEventKey: Accessor<string>
  eventDraft: Accessor<AdminEventDraft>
  tierDraft: Accessor<AdminTierDraft>
  isAuthorized: Accessor<boolean>
  errorMessage: Accessor<string>
  successMessage: Accessor<string>
  isSaving: Accessor<boolean>
  selectEvent: (event: EventItem) => void
  startNewEvent: () => void
  eventFieldChange: <K extends keyof AdminEventDraft>(field: K, value: AdminEventDraft[K]) => void
  tierFieldChange: <K extends keyof AdminTierDraft>(field: K, value: AdminTierDraft[K]) => void
  selectTier: (tier: EventTicketTier) => void
  saveEvent: () => Promise<void>
  saveTier: () => Promise<void>
  publishEvent: () => Promise<void>
}
