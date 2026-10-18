import { createResult, createResultError, type Result } from "#result"
import * as v from "valibot"

import type { DashEvent } from "../../../model/dashEventSchema.ts"
import { dashEventSchema } from "../../../model/dashEventSchema.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

/** Schaltet die Abendkasse eines Events um (Audit-Bereich "abendkasse"). */
export function dashBoxOfficeConfigSet(
  eventId: string,
  config: { enabled: boolean; opensAt: string | null },
  audit?: { action: string; before?: string | null; after?: string | null },
  store: DashStore = dashStoreGet(),
): Result<void> {
  const op = "dashBoxOfficeConfigSet"
  const event = store.state.events.find((candidate) => candidate.id === eventId)
  if (!event) return createResultError(op, "Event nicht gefunden.")
  const next: DashEvent = {
    ...event,
    boxOffice: { enabled: config.enabled, opensAt: config.opensAt },
    updatedAt: new Date().toISOString(),
  }
  if (!v.safeParse(dashEventSchema, next).success)
    return createResultError(op, "Die Abendkassen-Einstellung ist ungültig.")
  return store.update(op, (draft) => {
    const target = draft.events.find((candidate) => candidate.id === eventId)
    if (!target) throw new Error("Event nicht gefunden.")
    target.boxOffice = { enabled: config.enabled, opensAt: config.opensAt }
    target.updatedAt = next.updatedAt
    if (audit)
      dashAuditAdd(draft, {
        orgId: target.orgId,
        eventId: target.id,
        area: "abendkasse",
        action: audit.action,
        before: audit.before ?? null,
        after: audit.after ?? null,
      })
  })
}
