import { createResult, createResultError, type Result } from "#result"
import * as v from "valibot"

import type { DashEvent } from "../../model/dashEventSchema.ts"
import { dashEventSchema } from "../../model/dashEventSchema.ts"
import { dashAuditAdd } from "../dashAuditAdd.ts"
import type { DashStore } from "../dashStoreCreate.ts"
import { dashStoreGet } from "../dashStoreGet.ts"

export function dashEventPatch(
  eventId: string,
  patch: Partial<Omit<DashEvent, "id" | "orgId" | "createdAt">>,
  audit?: { action: string; before?: string | null; after?: string | null },
  store: DashStore = dashStoreGet(),
): Result<void> {
  const op = "dashEventPatch"
  const event = store.state.events.find((candidate) => candidate.id === eventId)
  if (!event) return createResultError(op, "Event nicht gefunden.")
  const nowIso = new Date().toISOString()
  const next = { ...event, ...patch, updatedAt: nowIso }
  if (event.status !== "veroeffentlicht" && next.status === "veroeffentlicht" && next.publishedAt === null)
    next.publishedAt = nowIso
  if (!v.safeParse(dashEventSchema, next).success) return createResultError(op, "Die Event-Daten sind ungültig.")
  return store.update(op, (draft) => {
    const target = draft.events.find((candidate) => candidate.id === eventId)
    if (!target) throw new Error("Event nicht gefunden.")
    Object.assign(target, next)
    if (audit)
      dashAuditAdd(draft, {
        orgId: target.orgId,
        eventId: target.id,
        area: "event",
        action: audit.action,
        before: audit.before ?? null,
        after: audit.after ?? null,
      })
  })
}
