import { createResult, createResultError, type Result } from "#result"

import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

export type DashCodeBulkPatchInput = {
  validUntil?: string | null
  maxTickets?: number | null
}

/** Ändert Gültigkeit oder Limit mehrerer Codes auf einmal (du sprichst). */
export function dashCodeBulkPatch(
  ids: string[],
  patch: DashCodeBulkPatchInput,
  store: DashStore = dashStoreGet(),
): Result<number> {
  const op = "dashCodeBulkPatch"
  if (ids.length === 0) return createResultError(op, "Bitte wähle mindestens einen Code.")
  if (patch.maxTickets !== undefined && patch.maxTickets !== null) {
    if (!Number.isInteger(patch.maxTickets) || patch.maxTickets < 1)
      return createResultError(op, "Das Limit muss eine ganze Zahl ab 1 sein.")
  }
  if (patch.validUntil !== undefined && patch.validUntil !== null && Number.isNaN(Date.parse(patch.validUntil)))
    return createResultError(op, "„Gültig bis“ ist kein gültiges Datum.")
  const targets = store.state.codes.filter((code) => ids.includes(code.id))
  if (targets.length === 0) return createResultError(op, "Keine Codes gefunden.")
  const updated = store.update(op, (draft) => {
    for (const target of draft.codes) {
      if (!ids.includes(target.id)) continue
      if (patch.validUntil !== undefined) {
        if (
          patch.validUntil !== null &&
          target.validFrom !== null &&
          Date.parse(patch.validUntil) <= Date.parse(target.validFrom)
        )
          throw new Error("„Gültig bis“ muss nach „Gültig von“ liegen.")
        target.validUntil = patch.validUntil
      }
      if (patch.maxTickets !== undefined) target.maxTickets = patch.maxTickets
    }
    const first = targets[0]
    if (!first) return
    const event = draft.events.find((candidate) => candidate.id === first.eventId)
    if (!event) return
    dashAuditAdd(draft, {
      orgId: event.orgId,
      eventId: event.id,
      area: "codes",
      action: `Code ${first.code} geändert`,
      before: null,
      after: patch.validUntil !== undefined ? "Gültigkeit geändert" : "Limit geändert",
    })
  })
  if (!updated.success) return createResultError(op, updated.errorMessage)
  return createResult(targets.length)
}
