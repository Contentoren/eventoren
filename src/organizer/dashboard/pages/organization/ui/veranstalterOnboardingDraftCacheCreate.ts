import * as v from "valibot"
import { ticketStorageIdleWrite } from "#src/ticketing/ticketStorageIdleWrite.ts"
import {
  veranstalterOnboardingDraftSchema,
  type VeranstalterOnboardingDraft,
} from "./veranstalterOnboardingDraftSchema.ts"

export type VeranstalterOnboardingDraftCacheStore = {
  readonly getItem: (key: string) => string | null
  readonly setItem: (key: string, value: string) => void
  readonly removeItem: (key: string) => void
}

export type VeranstalterOnboardingDraftCache = {
  readonly load: () => VeranstalterOnboardingDraft | null
  readonly scheduleSave: (form: VeranstalterOnboardingDraft) => void
  readonly saveNow: (form: VeranstalterOnboardingDraft) => void
  readonly clear: () => void
}

/**
 * Unsent onboarding input cache. Stores only technical fields — consent
 * booleans are never persisted and must be reaffirmed after every reload.
 * Entries are validated on load and written debounced on idle so typing
 * never blocks; cleared on successful submission.
 */
export function veranstalterOnboardingDraftCacheCreate(
  store?: VeranstalterOnboardingDraftCacheStore | undefined,
  userId?: string,
): VeranstalterOnboardingDraftCache {
  const op = "veranstalterOnboardingDraftCacheCreate"
  const veranstalterOnboardingDraftKey = `eventoren.veranstalterOnboardingDraft.v2:${userId ?? "memory"}`
  let backing: VeranstalterOnboardingDraftCacheStore | Map<string, string> = new Map<string, string>()
  try {
    if (userId) backing = store ?? (typeof localStorage === "undefined" ? backing : localStorage)
  } catch {
    // Access to window.localStorage itself may throw in restricted browsers.
  }
  let pending: VeranstalterOnboardingDraft | null = null
  const schedule = ticketStorageIdleWrite(() => {
    const latest = pending
    pending = null
    if (latest) write(JSON.stringify(latest))
  })

  const read = (): string | null => {
    try {
      if (backing instanceof Map) return backing.get(veranstalterOnboardingDraftKey) ?? null
      return backing.getItem(veranstalterOnboardingDraftKey)
    } catch (error) {
      console.error(op, error)
      return null
    }
  }

  const write = (value: string): void => {
    try {
      if (backing instanceof Map) {
        backing.set(veranstalterOnboardingDraftKey, value)
        return
      }
      backing.setItem(veranstalterOnboardingDraftKey, value)
    } catch (error) {
      console.error(op, error)
    }
  }

  const remove = (): void => {
    try {
      if (backing instanceof Map) {
        backing.delete(veranstalterOnboardingDraftKey)
        return
      }
      backing.removeItem(veranstalterOnboardingDraftKey)
    } catch (error) {
      console.error(op, error)
    }
  }

  return {
    load: () => {
      const raw = read()
      if (!raw) return null
      try {
        const parsed = v.safeParse(veranstalterOnboardingDraftSchema, JSON.parse(raw))
        if (!parsed.success) return null
        return parsed.output
      } catch {
        return null
      }
    },
    scheduleSave: (form) => {
      pending = { ...form }
      schedule()
    },
    saveNow: (form) => {
      pending = null
      write(JSON.stringify({ ...form }))
    },
    clear: () => {
      pending = null
      remove()
    },
  }
}
