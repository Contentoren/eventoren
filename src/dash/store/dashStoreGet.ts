import { type DashStore, dashStoreCreate } from "./dashStoreCreate.ts"
import { dashSeedCreate } from "./seed/dashSeedCreate.ts"

let dashStoreInstance: DashStore | null = null
let dashStoreFlushRegistered = false

function dashStoreFlushRegister(store: DashStore): void {
  if (typeof window === "undefined") return
  if (dashStoreFlushRegistered) return
  dashStoreFlushRegistered = true
  window.addEventListener("pagehide", () => store.flush())
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") store.flush()
  })
}

function dashStoreOptions(): Parameters<typeof dashStoreCreate>[0] {
  if (typeof window === "undefined") return { storage: null, now: () => new Date(), seed: (now) => dashSeedCreate(now) }
  return {
    storage: window.localStorage,
    now: () => new Date(),
    seed: (now) => dashSeedCreate(now),
    addStorageListener: (handler) => {
      const listener = (event: StorageEvent) => handler({ key: event.key, newValue: event.newValue })
      window.addEventListener("storage", listener)
      return () => window.removeEventListener("storage", listener)
    },
    schedule: (fn) => {
      if (typeof window.requestIdleCallback === "function")
        // Hintergrund-Tabs verzögern Idle-Callbacks; `timeout` garantiert Persistenz für andere Tabs.
        window.requestIdleCallback(() => fn(), { timeout: 500 })
      else setTimeout(fn, 0)
    },
  }
}

export function dashStoreGet(): DashStore {
  dashStoreInstance ??= dashStoreCreate(dashStoreOptions())
  dashStoreFlushRegister(dashStoreInstance)
  return dashStoreInstance
}
