import { createStore, produce, reconcile, type Store } from "solid-js/store"
import * as v from "valibot"
import { createResult, createResultError, type Result } from "#result"
import { dashStateDayShift } from "../model/dashStateDayShift.ts"
import type { DashState } from "../model/dashStateSchema.ts"
import { dashStateSchema } from "../model/dashStateSchema.ts"

export type DashStorage = Pick<Storage, "getItem" | "setItem">

export type DashStoreListener = (event: { key: string | null; newValue: string | null }) => void

export function dashStoreCreate(options: {
  storage: DashStorage | null
  now: () => Date
  seed: (now: Date) => DashState
  key?: string
  addStorageListener?: (handler: DashStoreListener) => () => void
  schedule?: (fn: () => void) => void
}): DashStore {
  const storeKey = options.key ?? "eventoren-demo-plattform-v1"
  const schedule = options.schedule ?? dashScheduleIdle
  const state = dashStoreStateLoad({ storage: options.storage, now: options.now, seed: options.seed, storeKey })
  const [store, setStore] = createStore<DashState>(state.initial)
  let dirty = false
  let queued = false
  let disposed = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const persistWrite = () => {
    try {
      options.storage?.setItem(storeKey, JSON.stringify(store))
    } catch {
      // localStorage voll oder blockiert – Demo läuft ohne Persistenz weiter
    }
  }

  const persistCancel = () => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
    queued = false
  }

  const persistNow = () => {
    persistCancel()
    if (disposed) return
    // Nur bei zwischenzeitlicher Änderung schreiben: Ein nicht-dirty Flush (z. B. pagehide
    // nach Reload) darf einen manuell entfernten Storage-Eintrag nicht neu anlegen.
    if (!dirty) return
    dirty = false
    persistWrite()
  }

  const persistImmediate = () => {
    if (disposed) return
    persistCancel()
    dirty = false
    persistWrite()
  }

  const persistDebounced = () => {
    if (disposed) return
    dirty = true
    if (queued) return
    queued = true
    timer = setTimeout(() => {
      timer = undefined
      if (disposed) {
        queued = false
        return
      }
      schedule(persistNow)
    }, 400)
  }

  const unsubscribe = options.addStorageListener?.((event) => {
    if (disposed) return
    if (event.key !== storeKey || event.newValue === null) return
    let parsed: unknown
    try {
      parsed = JSON.parse(event.newValue)
    } catch {
      return
    }
    const validated = v.safeParse(dashStateSchema, parsed)
    if (!validated.success) return
    setStore(reconcile(validated.output))
  })

  return {
    state: store,
    update(updateOp, fn) {
      if (disposed) return createResultError(updateOp, "Der Store wurde bereits aufgeräumt.")
      try {
        setStore(
          produce((draft: DashState) => {
            fn(draft)
          }),
        )
      } catch (error) {
        return createResultError(updateOp, error instanceof Error ? error.message : "Unbekannter Fehler.")
      }
      persistDebounced()
      return createResult(undefined)
    },
    replace(next) {
      const validated = v.safeParse(dashStateSchema, next)
      if (!validated.success) return
      setStore(reconcile(validated.output))
      persistDebounced()
    },
    reset() {
      setStore(reconcile(options.seed(options.now())))
      // Synchron schreiben: Ein Reload direkt danach lädt denselben frischen Seed,
      // ein späterer pagehide-Flush schreibt denselben (neuen) Zustand.
      persistImmediate()
    },
    resetEmpty() {
      const empty = options.seed(options.now())
      empty.users = [{ id: "user-neu", name: "", email: "" }]
      empty.session = { userId: "user-neu", activeOrgId: null, simulatedRole: null }
      setStore(reconcile(empty))
      persistImmediate()
    },
    flush() {
      persistNow()
    },
    dispose() {
      disposed = true
      unsubscribe?.()
    },
  }
}

export type DashStore = {
  readonly state: Store<DashState>
  update(op: string, fn: (draft: DashState) => void): Result<void>
  replace(next: DashState): void
  reset(): void
  resetEmpty(): void
  flush(): void
  dispose(): void
}

function dashScheduleIdle(fn: () => void): void {
  const scope = globalThis as {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  }
  // Wichtig: als Methode auf `scope` aufrufen (ungebunden wirft "Illegal invocation")
  // und per `timeout` absichern, damit Hintergrund-Tabs nicht ewig auf Idle warten.
  if (typeof scope.requestIdleCallback === "function") scope.requestIdleCallback(fn, { timeout: 500 })
  else setTimeout(fn, 0)
}

function dashBerlinDateOnly(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

function dashStateSchemaParse(raw: string): DashState | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  const validated = v.safeParse(dashStateSchema, parsed)
  if (!validated.success) return null
  return validated.output
}

function dashStoreStateLoad(options: {
  storage: DashStorage | null
  now: () => Date
  seed: (now: Date) => DashState
  storeKey: string
}): { initial: DashState } {
  const now = options.now()
  const fresh = () => options.seed(now)
  if (!options.storage) return { initial: fresh() }
  let raw: string | null = null
  try {
    raw = options.storage.getItem(options.storeKey)
  } catch {
    return { initial: fresh() }
  }
  if (raw === null) return { initial: fresh() }
  const stored = dashStateSchemaParse(raw)
  if (!stored) return { initial: fresh() }
  const today = dashBerlinDateOnly(now)
  if (stored.seedDay === today) return { initial: stored }
  const startOfStoredDay = new Date(`${stored.seedDay}T00:00:00Z`).getTime()
  const startOfToday = new Date(`${today}T00:00:00Z`).getTime()
  const days =
    Number.isNaN(startOfStoredDay) || Number.isNaN(startOfToday)
      ? 0
      : Math.round((startOfToday - startOfStoredDay) / 86_400_000)
  const shifted = dashStateDayShift(stored, days)
  shifted.seedDay = today
  return { initial: shifted }
}
