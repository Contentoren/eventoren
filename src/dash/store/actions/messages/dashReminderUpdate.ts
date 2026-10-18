import { createResultError, type Result } from "#result"

import type { DashReminder } from "../../../model/dashReminderSchema.ts"
import { dashEventPatch } from "../dashEventPatch.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

export type DashReminderUpdateInput = {
  eventId: string
  patch: Partial<Pick<DashReminder, "enabled" | "directions" | "calendar">>
}

/** Passt die automatische Erinnerung eines Events an (du sprichst). */
export function dashReminderUpdate(input: DashReminderUpdateInput, store: DashStore = dashStoreGet()): Result<void> {
  const op = "dashReminderUpdate"
  const event = store.state.events.find((candidate) => candidate.id === input.eventId)
  if (!event) return createResultError(op, "Event nicht gefunden.")
  const reminder: DashReminder = {
    ...event.reminder,
    enabled: input.patch.enabled ?? event.reminder.enabled,
    directions: input.patch.directions ?? event.reminder.directions,
    calendar: input.patch.calendar ?? event.reminder.calendar,
  }
  const action =
    input.patch.enabled === false ? "Automatische Erinnerung ausgeschaltet" : "Automatische Erinnerung geändert"
  return dashEventPatch(
    input.eventId,
    { reminder },
    { action, before: null, after: reminder.enabled ? "an" : "aus" },
    store,
  )
}
