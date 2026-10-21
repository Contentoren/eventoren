import * as v from "valibot"
import { ticketStorageIdleWrite } from "#src/ticketing/ticketStorageIdleWrite.ts"
import type { VeranstalterDashboardEventBaseForm } from "./veranstalterDashboardEventFormValidate.ts"

const veranstalterDashboardEventCreateDraftCacheSchema = v.object({
  title: v.string(),
  subtitle: v.string(),
  description: v.string(),
  category: v.string(),
  startsAtLocal: v.string(),
  endsAtLocal: v.string(),
  doorsAtLocal: v.string(),
  bookingOpensAtLocal: v.string(),
  venue: v.string(),
  city: v.string(),
  address: v.string(),
  organizer: v.string(),
  imageUrl: v.string(),
  imageAlt: v.string(),
})

export type VeranstalterDashboardEventCreateDraftCacheStore = {
  readonly getItem: (key: string) => string | null
  readonly setItem: (key: string, value: string) => void
  readonly removeItem: (key: string) => void
}

export type VeranstalterDashboardEventCreateDraftCache = {
  readonly load: (orgId: string, eventKey: string | null) => VeranstalterDashboardEventBaseForm | null
  readonly scheduleSave: (orgId: string, eventKey: string | null, form: VeranstalterDashboardEventBaseForm) => void
  readonly clear: (orgId: string, eventKey: string | null) => void
}

/**
 * Unsent wizard input cache, scoped per organization and server draft. Browser
 * storage is inherently per user. Entries are strictly validated on load and
 * written debounced on idle so typing never blocks; the cache is never the
 * authority store — the server draft always wins on resume.
 */
export function veranstalterDashboardEventCreateDraftCacheCreate(
  store?: VeranstalterDashboardEventCreateDraftCacheStore | undefined,
): VeranstalterDashboardEventCreateDraftCache {
  const op = "veranstalterDashboardEventCreateDraftCacheCreate"
  const backing = store ?? new Map<string, string>()
  const pending = new Map<string, VeranstalterDashboardEventBaseForm>()
  const schedulers = new Map<string, () => void>()

  const key = (orgId: string, eventKey: string | null): string =>
    `veranstalter-event-entwurf:${orgId}:${eventKey ?? "neu"}`

  const read = (storageKey: string): string | null => {
    try {
      if (backing instanceof Map) return backing.get(storageKey) ?? null
      return backing.getItem(storageKey)
    } catch (error) {
      console.error(op, error)
      return null
    }
  }

  const write = (storageKey: string, value: string): void => {
    try {
      if (backing instanceof Map) {
        backing.set(storageKey, value)
        return
      }
      backing.setItem(storageKey, value)
    } catch (error) {
      console.error(op, error)
    }
  }

  const remove = (storageKey: string): void => {
    try {
      if (backing instanceof Map) {
        backing.delete(storageKey)
        return
      }
      backing.removeItem(storageKey)
    } catch (error) {
      console.error(op, error)
    }
  }

  return {
    load: (orgId, eventKey) => {
      const raw = read(key(orgId, eventKey))
      if (!raw) return null
      try {
        const parsed = v.safeParse(veranstalterDashboardEventCreateDraftCacheSchema, JSON.parse(raw))
        if (!parsed.success) return null
        return parsed.output
      } catch {
        return null
      }
    },
    scheduleSave: (orgId, eventKey, form) => {
      const storageKey = key(orgId, eventKey)
      pending.set(storageKey, { ...form })
      let schedule = schedulers.get(storageKey)
      if (!schedule) {
        schedule = ticketStorageIdleWrite(() => {
          const latest = pending.get(storageKey)
          pending.delete(storageKey)
          if (latest) write(storageKey, JSON.stringify(latest))
        })
        schedulers.set(storageKey, schedule)
      }
      schedule()
    },
    clear: (orgId, eventKey) => {
      pending.delete(key(orgId, eventKey))
      remove(key(orgId, eventKey))
    },
  }
}
