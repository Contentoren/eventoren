import { describe, expect, test } from "bun:test"
import { dashAdminOrgApprove } from "./actions/admin/dashAdminOrgApprove.ts"
import { dashOnboardingComplete } from "./actions/onboarding/dashOnboardingComplete.ts"
import { dashSeedCreate } from "./seed/dashSeedCreate.ts"
import { dashStoreCreate, type DashStorage, type DashStoreListener } from "./dashStoreCreate.ts"

const dashResetKey = "eventoren-demo-plattform-v1"

function dashMapStorage(): DashStorage & { values: Map<string, string> } {
  const values = new Map<string, string>()
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

function dashOnboardingInput(slug: string) {
  return {
    account: { name: "Galerie Nordlicht", email: "galerie@nordlicht.de" },
    org: { kind: "verein" as const, name: "Galerie Nordlicht", slug, logoDataUrl: null },
    imprint: {
      legalName: "Galerie Nordlicht e.V.",
      street: "Lichtweg 1",
      zip: "04109",
      city: "Leipzig",
      representative: "Galerie Nordlicht (1. Vorsitzende)",
      register: "VR 4711, Amtsgericht Leipzig",
      vatId: "",
    },
    tax: { status: "klein" as const },
    bank: { holder: "Galerie Nordlicht e.V.", iban: "DE89370400440532013000" },
    termsAccepted: true as const,
    dpaAccepted: true as const,
  }
}

/** Zwei Tabs mit einem geteilten Storage; Zustellung wie im Browser (asynchron, steuerbar). */
function dashTwoTabsCreate(current: { now: Date }, scheduleB?: (fn: () => void) => void) {
  const values = new Map<string, string>()
  const listeners = new Map<object, DashStoreListener>()
  const pending: Array<{ owner: object; key: string; newValue: string }> = []
  const deliver = (owner?: object) => {
    const due = owner === undefined ? pending.splice(0) : pending.filter((entry) => entry.owner === owner)
    if (owner !== undefined) {
      for (let index = pending.length - 1; index >= 0; index -= 1) {
        if (pending[index]?.owner === owner) pending.splice(index, 1)
      }
    }
    for (const entry of due) listeners.get(entry.owner)?.({ key: entry.key, newValue: entry.newValue })
  }
  const mk = (schedule?: (fn: () => void) => void) => {
    const box: object = {}
    return dashStoreCreate({
      storage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
          values.set(key, value)
          for (const owner of listeners.keys()) {
            if (owner !== box) pending.push({ owner, key, newValue: value })
          }
        },
      },
      now: () => current.now,
      seed: (now) => dashSeedCreate(now),
      schedule: schedule ?? ((fn) => fn()),
      addStorageListener: (handler) => {
        listeners.set(box, handler)
        return () => {
          listeners.delete(box)
        }
      },
    })
  }
  return { values, deliver, mk }
}

describe("dashStoreReset (E3-F1)", () => {
  test("reset nach resetEmpty + Onboarding + Freigabe stellt den frischen Seed wieder her", () => {
    const storage = dashMapStorage()
    const current = { now: new Date("2026-10-26T10:00:00.000Z") }
    const store = dashStoreCreate({
      storage,
      now: () => current.now,
      seed: (now) => dashSeedCreate(now),
      schedule: (fn) => fn(),
    })
    try {
      store.resetEmpty()
      expect(store.state.users.map((user) => user.id)).toEqual(["user-neu"])
      expect(store.state.session).toEqual({ userId: "user-neu", activeOrgId: null, simulatedRole: null })

      const onboarded = dashOnboardingComplete(dashOnboardingInput("galerie-nordlicht"), store)
      expect(onboarded.success).toBe(true)
      if (!onboarded.success) throw new Error("Onboarding schlug fehl")
      const approved = dashAdminOrgApprove(onboarded.data.orgId, store)
      expect(approved.success).toBe(true)
      store.flush()
      expect(store.state.orgs.some((org) => org.id === onboarded.data.orgId)).toBe(true)

      current.now = new Date("2026-10-26T12:00:00.000Z")
      store.reset()

      expect(store.state.orgs.map((org) => org.id)).toContain("org-lindenhof")
      expect(store.state.session.userId).toBe("user-mara")
      expect(store.state.session.activeOrgId).toBe("org-lindenhof")
      expect(store.state.events.some((event) => event.id === "ev-jazz-wein")).toBe(true)

      const raw = storage.values.get(dashResetKey)
      expect(raw).toBeDefined()
      const stored = JSON.parse(raw ?? "")
      expect(stored.orgs.map((org: { id: string }) => org.id)).toContain("org-lindenhof")
      expect(stored.session).toEqual({ userId: "user-mara", activeOrgId: "org-lindenhof", simulatedRole: null })
      expect(stored.events.some((event: { id: string }) => event.id === "ev-jazz-wein")).toBe(true)
    } finally {
      store.dispose()
    }
  })

  test("Leeres Konto liefert Seed-Orgs plus leeren neuen Nutzer", () => {
    const storage = dashMapStorage()
    const store = dashStoreCreate({
      storage,
      now: () => new Date("2026-10-26T10:00:00.000Z"),
      seed: (now) => dashSeedCreate(now),
      schedule: (fn) => fn(),
    })
    try {
      store.resetEmpty()
      expect(store.state.users).toEqual([{ id: "user-neu", name: "", email: "" }])
      expect(store.state.session).toEqual({ userId: "user-neu", activeOrgId: null, simulatedRole: null })
      expect(store.state.orgs.map((org) => org.id)).toContain("org-lindenhof")
      const stored = JSON.parse(storage.values.get(dashResetKey) ?? "")
      expect(stored.users).toEqual([{ id: "user-neu", name: "", email: "" }])
      expect(stored.orgs.map((org: { id: string }) => org.id)).toContain("org-lindenhof")
    } finally {
      store.dispose()
    }
  })

  test("zweiter Tab überschreibt einen Reset nicht mit altem Zustand (Reset gewinnt)", async () => {
    const current = { now: new Date("2026-10-26T10:00:00.000Z") }
    const queuedB: Array<() => void> = []
    const tabs = dashTwoTabsCreate(current)
    const tabA = tabs.mk()
    const tabB = tabs.mk((fn) => {
      queuedB.push(fn)
    })
    try {
      tabA.resetEmpty()
      tabs.deliver()
      const onboarded = dashOnboardingComplete(dashOnboardingInput("galerie-nordlicht"), tabA)
      expect(onboarded.success).toBe(true)
      if (!onboarded.success) throw new Error("Onboarding schlug fehl")
      tabA.flush()
      tabs.deliver()
      expect(tabB.state.session.activeOrgId).toBe(onboarded.data.orgId)

      // Tab B editiert (Debounce-Timer steht noch aus), dann resettet Tab A.
      tabB.update("b-notiz", (draft) => {
        draft.orgs[0]!.name = "ALT-B"
      })
      current.now = new Date("2026-10-26T12:00:00.000Z")
      tabA.reset()
      // Bs Timer feuert ERST NACH dem Reset (Debounce 400 ms), bevor das Reset-Event zugestellt wird.
      await new Promise((resolve) => setTimeout(resolve, 450))
      expect(queuedB).toHaveLength(1)
      for (const fn of queuedB.splice(0)) fn()
      tabs.deliver()

      const stored = JSON.parse(tabs.values.get(dashResetKey) ?? "")
      expect(stored.orgs.map((org: { id: string }) => org.id)).toContain("org-lindenhof")
      expect(stored.orgs.some((org: { id: string }) => org.id === onboarded.data.orgId)).toBe(false)
      expect(stored.session).toEqual({ userId: "user-mara", activeOrgId: "org-lindenhof", simulatedRole: null })
      expect(stored.events.some((event: { id: string }) => event.id === "ev-jazz-wein")).toBe(true)
      expect(tabA.state.orgs.map((org) => org.id)).toContain("org-lindenhof")
      expect(tabA.state.session.userId).toBe("user-mara")
      expect(tabA.state.session.activeOrgId).toBe("org-lindenhof")
    } finally {
      tabA.dispose()
      tabB.dispose()
    }
  })

  test("Tab übernimmt neueren Reset per Storage-Event und verwirft ungespeicherte Änderungen", async () => {
    const current = { now: new Date("2026-10-26T10:00:00.000Z") }
    const queuedB: Array<() => void> = []
    const tabs = dashTwoTabsCreate(current)
    const tabA = tabs.mk()
    const tabB = tabs.mk((fn) => {
      queuedB.push(fn)
    })
    try {
      tabA.resetEmpty()
      tabs.deliver()
      const onboarded = dashOnboardingComplete(dashOnboardingInput("galerie-nordlicht"), tabA)
      expect(onboarded.success).toBe(true)
      if (!onboarded.success) throw new Error("Onboarding schlug fehl")
      tabA.flush()
      tabs.deliver()

      tabB.update("b-notiz", (draft) => {
        draft.orgs[0]!.name = "ALT-B"
      })

      current.now = new Date("2026-10-26T12:00:00.000Z")
      tabA.reset()
      tabs.deliver()

      // Erst ab hier zählen: Der Reset selbst schreibt einmal (Seed), danach nichts mehr.
      let writes = 0
      const rawSet = tabs.values.set.bind(tabs.values)
      tabs.values.set = (key, value) => {
        writes += 1
        return rawSet(key, value)
      }

      // B hat den Reset übernommen; sein Flush schreibt nichts mehr.
      expect(tabB.state.session.userId).toBe("user-mara")
      expect(tabB.state.orgs.map((org) => org.id)).toContain("org-lindenhof")
      tabB.flush()
      expect(writes).toBe(0)
      await new Promise((resolve) => setTimeout(resolve, 450))
      for (const fn of queuedB.splice(0)) fn()
      expect(writes).toBe(0)
      const stored = JSON.parse(tabs.values.get(dashResetKey) ?? "")
      expect(stored.session.userId).toBe("user-mara")
    } finally {
      tabA.dispose()
      tabB.dispose()
    }
  })
})
