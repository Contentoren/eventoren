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
  const loaded = dashStoreStateLoad({ storage: options.storage, now: options.now, seed: options.seed, storeKey })
  const [store, setStore] = createStore<DashState>(loaded.initial)
  // Reset-Marke (E3-F1): ISO-Zeitpunkt des letzten reset()/resetEmpty(). Reisen als
  // Geschwister-Schlüssel `resetAt` neben dem State im Storage mit (außerhalb des
  // DashState-Schemas, das unbekannte Schlüssel beim Einlesen streift). Ein Reset
  // gewinnt damit immer gegen verspätete Schreibvorgänge anderer Tabs mit altem Zustand:
  // Wer eine neuere Marke sieht, übernimmt und verwirft ungespeicherte Änderungen;
  // wer eine ältere Marke hat, schreibt nicht mehr in den Storage.
  let resetAt: string | null = loaded.resetAt
  let dirty = false
  let queued = false
  let disposed = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const storageResetAtRead = (): string | null => {
    if (!options.storage) return null
    let raw: string | null = null
    try {
      raw = options.storage.getItem(storeKey)
    } catch {
      return null
    }
    if (raw === null) return null
    return dashStoredResetAtParse(raw)
  }

  const storageStateAdopt = (): boolean => {
    if (!options.storage) return false
    let raw: string | null = null
    try {
      raw = options.storage.getItem(storeKey)
    } catch {
      return false
    }
    if (raw === null) return false
    const parsed = dashStoredStateParse(raw)
    if (!parsed) return false
    resetAt = parsed.resetAt
    persistCancel()
    dirty = false
    setStore(reconcile(parsed.state))
    return true
  }

  const persistWrite = () => {
    try {
      options.storage?.setItem(storeKey, JSON.stringify({ ...store, resetAt }))
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
    // Reset gewinnt: Trägt der Storage eine neuere Reset-Marke (Reset aus einem anderen
    // Tab), wird nichts Altes geschrieben, sondern der neuere Zustand übernommen.
    const storedResetAt = storageResetAtRead()
    if (storedResetAt !== null && (resetAt === null || storedResetAt > resetAt)) {
      storageStateAdopt()
      return
    }
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
    const parsed = dashStoredStateParse(event.newValue)
    if (!parsed) return
    // Neuere Reset-Marke übernehmen und ungespeicherte Änderungen verwerfen: Der Reset
    // aus dem anderen Tab gewinnt, ein späterer eigener Flush schreibt nichts Altes nach.
    // Ältere Marken (verspätete Schreibvorgänge) werden ignoriert, gleiche wie bisher übernommen.
    if (parsed.resetAt !== null && (resetAt === null || parsed.resetAt > resetAt)) {
      resetAt = parsed.resetAt
      persistCancel()
      dirty = false
      setStore(reconcile(parsed.state))
      return
    }
    if (resetAt !== null && (parsed.resetAt === null || parsed.resetAt < resetAt)) return
    setStore(reconcile(parsed.state))
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
      // Reset-Marke monoton erhöhen (gegen gleichzeitige Resets anderer Tabs mit der
      // Storage-Marke als Basis), dann synchron schreiben: Ein Reload direkt danach lädt
      // denselben frischen Seed, ein späterer pagehide-Flush schreibt denselben (neuen) Zustand.
      resetAt = dashResetAtNext(options.now().toISOString(), resetAt, storageResetAtRead())
      setStore(reconcile(options.seed(options.now())))
      persistImmediate()
    },
    resetEmpty() {
      resetAt = dashResetAtNext(options.now().toISOString(), resetAt, storageResetAtRead())
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

function dashResetAtNext(nowIso: string, local: string | null, stored: string | null): string {
  let next = nowIso
  for (const candidate of [local, stored]) {
    if (candidate !== null && candidate >= next) {
      const bumped = new Date(Date.parse(candidate) + 1).toISOString()
      if (bumped > next) next = bumped
    }
  }
  return next
}

function dashStoredJsonParse(raw: string): Record<string, unknown> | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null
  return parsed as Record<string, unknown>
}

function dashStoredResetAtParse(raw: string): string | null {
  const parsed = dashStoredJsonParse(raw)
  if (!parsed) return null
  return typeof parsed["resetAt"] === "string" ? (parsed["resetAt"] as string) : null
}

function dashStoredStateParse(raw: string): { state: DashState; resetAt: string | null } | null {
  const parsed = dashStoredJsonParse(raw)
  if (!parsed) return null
  const validated = v.safeParse(dashStateSchema, parsed)
  if (!validated.success) return null
  return {
    state: validated.output,
    resetAt: typeof parsed["resetAt"] === "string" ? (parsed["resetAt"] as string) : null,
  }
}

function dashStateSchemaParse(raw: string): DashState | null {
  const parsed = dashStoredStateParse(raw)
  return parsed ? parsed.state : null
}

function dashStoreStateLoad(options: {
  storage: DashStorage | null
  now: () => Date
  seed: (now: Date) => DashState
  storeKey: string
}): { initial: DashState; resetAt: string | null } {
  const now = options.now()
  const fresh = () => options.seed(now)
  if (!options.storage) return { initial: fresh(), resetAt: null }
  let raw: string | null = null
  try {
    raw = options.storage.getItem(options.storeKey)
  } catch {
    return { initial: fresh(), resetAt: null }
  }
  if (raw === null) return { initial: fresh(), resetAt: null }
  const stored = dashStoredStateParse(raw)
  if (!stored) return { initial: fresh(), resetAt: dashStoredResetAtParse(raw) }
  const today = dashBerlinDateOnly(now)
  if (stored.state.seedDay === today) return { initial: stored.state, resetAt: stored.resetAt }
  const startOfStoredDay = new Date(`${stored.state.seedDay}T00:00:00Z`).getTime()
  const startOfToday = new Date(`${today}T00:00:00Z`).getTime()
  const days =
    Number.isNaN(startOfStoredDay) || Number.isNaN(startOfToday)
      ? 0
      : Math.round((startOfToday - startOfStoredDay) / 86_400_000)
  const shifted = dashStateDayShift(stored.state, days)
  shifted.seedDay = today
  return { initial: shifted, resetAt: stored.resetAt }
}
