import { describe, expect, test } from "bun:test"
import * as v from "valibot"

import type { DashState } from "../model/dashStateSchema.ts"
import { dashStateSchema } from "../model/dashStateSchema.ts"
import { dashSeedCreate } from "./seed/dashSeedCreate.ts"
import { dashActiveOrgIn } from "./dashActiveOrgIn.ts"
import { dashActiveRoleIn } from "./dashActiveRoleIn.ts"
import { dashCanIn } from "./dashCanIn.ts"
import { dashOrgEventsIn } from "./dashOrgEventsIn.ts"
import { dashEventByIdIn } from "./dashEventByIdIn.ts"
import { dashOrgBySlugIn } from "./dashOrgBySlugIn.ts"
import { dashEventBySlugsIn } from "./dashEventBySlugsIn.ts"
import { dashStoreCreate, type DashStorage, type DashStoreListener } from "./dashStoreCreate.ts"
import { dashIdCreate } from "./dashIdCreate.ts"
import { dashAuditAdd } from "./dashAuditAdd.ts"

function dashFakeStorage(): DashStorage & { values: Map<string, string>; listeners: Array<DashStoreListener> } {
  const values = new Map<string, string>()
  const storage = {
    values,
    listeners: [] as Array<DashStoreListener>,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
  return storage
}

function dashFakeSeed(now: Date): DashState {
  const base = dashSeedCreate(now)
  return {
    ...base,
    users: [
      { id: "user-mara", name: "Mara Lindner", email: "mara@example.de" },
      { id: "user-neu", name: "", email: "" },
    ],
    orgs: [
      {
        id: "org-lindenhof",
        slug: "kulturhaus-lindenhof",
        name: "Kulturhaus Lindenhof e.V.",
        kind: "verein",
        subtitle: "",
        description: "",
        logoDataUrl: null,
        website: "",
        email: "",
        phone: "",
        socials: { instagram: "", facebook: "", tiktok: "", youtube: "", x: "", linkedin: "" },
        imprint: {
          legalName: "Kulturhaus Lindenhof e.V.",
          street: "",
          zip: "",
          city: "",
          representative: "",
          register: "",
          vatId: "",
        },
        bank: { holder: "", iban: "" },
        tax: { status: "regel", defaultRateBps: 700 },
        fee: { percentBps: 500, fixedCents: 49, payer: "kaeufer" },
        status: "aktiv",
        statusReason: "",
        termsAcceptedAt: null,
        dpaAcceptedAt: null,
        createdAt: now.toISOString(),
        voucherDefaultValidity: "3-jahre-jahresende",
      },
    ],
    members: [
      {
        id: "member-mara",
        orgId: "org-lindenhof",
        userId: "user-mara",
        name: "Mara Lindner",
        email: "mara@example.de",
        role: "inhaber",
        status: "aktiv",
        invitedAt: now.toISOString(),
      },
    ],
    events: [
      {
        id: "ev-spaet",
        orgId: "org-lindenhof",
        slug: "spaet",
        title: "Spät",
        subtitle: "",
        category: "konzert",
        startsAt: "2026-08-06T18:00:00.000Z",
        endsAt: "2026-08-06T21:00:00.000Z",
        doorsAt: null,
        venue: { name: "Hof", street: "", zip: "", city: "" },
        imageUrl: "",
        imageAlt: "Bild",
        description: "",
        faq: [],
        schedule: [],
        status: "veroeffentlicht",
        visibility: "oeffentlich",
        salesPaused: false,
        cancelReason: "",
        boxOffice: { enabled: false, opensAt: null },
        reminder: { enabled: false, hoursBefore: 24, directions: "", calendar: "", sentAt: null },
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        publishedAt: null,
      },
      {
        id: "ev-frueh",
        orgId: "org-lindenhof",
        slug: "frueh",
        title: "Früh",
        subtitle: "",
        category: "party",
        startsAt: "2026-08-01T18:00:00.000Z",
        endsAt: "2026-08-01T21:00:00.000Z",
        doorsAt: null,
        venue: { name: "Hof", street: "", zip: "", city: "" },
        imageUrl: "",
        imageAlt: "Bild",
        description: "",
        faq: [],
        schedule: [],
        status: "veroeffentlicht",
        visibility: "oeffentlich",
        salesPaused: false,
        cancelReason: "",
        boxOffice: { enabled: false, opensAt: null },
        reminder: { enabled: false, hoursBefore: 24, directions: "", calendar: "", sentAt: null },
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        publishedAt: null,
      },
    ],
  }
}

function dashStoreTestCreate(storage: DashStorage, now: Date) {
  const listeners: Array<DashStoreListener> = []
  const store = dashStoreCreate({
    storage,
    now: () => now,
    seed: dashFakeSeed,
    schedule: (fn) => fn(),
    addStorageListener: (handler) => {
      listeners.push(handler)
      return () => {
        const index = listeners.indexOf(handler)
        if (index >= 0) listeners.splice(index, 1)
      }
    },
  })
  return { store, listeners }
}

describe("dashStoreCreate", () => {
  test("seedet neu bei ungültigem JSON", () => {
    const storage = dashFakeStorage()
    storage.setItem("eventoren-demo-plattform-v1", "{kaputt")
    const { store } = dashStoreTestCreate(storage, new Date("2026-10-26T10:00:00.000Z"))
    expect(store.state.session.userId).toBe("user-mara")
    expect(v.safeParse(dashStateSchema, JSON.parse(JSON.stringify(store.state))).success).toBe(true)
    store.dispose()
  })

  test("seedet neu bei gültigem JSON mit falschem Schema", () => {
    const storage = dashFakeStorage()
    storage.setItem("eventoren-demo-plattform-v1", JSON.stringify({ version: 1 }))
    const { store } = dashStoreTestCreate(storage, new Date("2026-10-26T10:00:00.000Z"))
    expect(store.state.users).toHaveLength(2)
    store.dispose()
  })

  test("persistiert nach update und fängt Fehler aus fn ab", () => {
    const storage = dashFakeStorage()
    const { store } = dashStoreTestCreate(storage, new Date("2026-10-26T10:00:00.000Z"))
    const result = store.update("test", (draft) => {
      draft.session.activeOrgId = "org-lindenhof"
    })
    expect(result.success).toBe(true)
    const throwing = store.update("kaputt", () => {
      throw new Error("Fehler im Draft")
    })
    expect(throwing.success).toBe(false)
    store.flush()
    const persisted = storage.values.get("eventoren-demo-plattform-v1")
    expect(persisted).toBeDefined()
    expect(JSON.parse(persisted ?? "").session.activeOrgId).toBe("org-lindenhof")
    store.dispose()
  })

  test("wendet externe Storage-Events an und ignoriert ungültige", () => {
    const storage = dashFakeStorage()
    const { store, listeners } = dashStoreTestCreate(storage, new Date("2026-10-26T10:00:00.000Z"))
    expect(listeners).toHaveLength(1)
    const next = dashFakeSeed(new Date("2026-10-26T10:00:00.000Z"))
    next.session.activeOrgId = "org-lindenhof"
    listeners[0]?.({ key: "eventoren-demo-plattform-v1", newValue: JSON.stringify(next) })
    expect(store.state.session.activeOrgId).toBe("org-lindenhof")
    listeners[0]?.({ key: "eventoren-demo-plattform-v1", newValue: "{kaputt" })
    expect(store.state.session.activeOrgId).toBe("org-lindenhof")
    listeners[0]?.({ key: "eventoren-demo-plattform-v1", newValue: JSON.stringify({ version: 1 }) })
    expect(store.state.session.activeOrgId).toBe("org-lindenhof")
    listeners[0]?.({ key: "anderer-schluessel", newValue: JSON.stringify(next) })
    expect(store.state.session.activeOrgId).toBe("org-lindenhof")
    store.dispose()
    expect(listeners).toHaveLength(0)
  })

  test("verschiebt Zeitpunkte bei Day Shift und aktualisiert seedDay", () => {
    const storage = dashFakeStorage()
    const seeded = dashFakeSeed(new Date("2026-10-24T10:00:00.000Z"))
    seeded.seedDay = "2026-10-24"
    storage.setItem("eventoren-demo-plattform-v1", JSON.stringify(seeded))
    const { store } = dashStoreTestCreate(storage, new Date("2026-10-26T10:00:00.000Z"))
    expect(store.state.seedDay).toBe("2026-10-26")
    const event = store.state.events.find((candidate) => candidate.id === "ev-frueh")
    expect(event?.startsAt).toBe("2026-08-03T18:00:00.000Z")
    store.dispose()
  })

  test("resetEmpty meldet user-neu ohne Mitgliedschaft an", () => {
    const storage = dashFakeStorage()
    const { store } = dashStoreTestCreate(storage, new Date("2026-10-26T10:00:00.000Z"))
    store.resetEmpty()
    expect(store.state.session).toEqual({ userId: "user-neu", activeOrgId: null, simulatedRole: null })
    expect(store.state.users).toEqual([{ id: "user-neu", name: "", email: "" }])
    expect(dashActiveOrgIn(store.state)).toBeNull()
    expect(dashActiveRoleIn(store.state)).toBeNull()
    store.dispose()
  })
})

describe("dashStore Reset-Race", () => {
  const dashResetKey = "eventoren-demo-plattform-v1"

  function dashResetStoreCreate(storage: DashStorage, current: { now: Date }) {
    const queued: Array<() => void> = []
    const store = dashStoreCreate({
      storage,
      now: () => current.now,
      seed: dashFakeSeed,
      schedule: (fn) => {
        queued.push(fn)
      },
    })
    return { store, queued }
  }

  test("reset schreibt den frischen Seed synchron und ein späterer Flush schreibt denselben Zustand", async () => {
    const storage = dashFakeStorage()
    let writes = 0
    const rawSetItem = storage.setItem
    storage.setItem = (key, value) => {
      writes += 1
      rawSetItem(key, value)
    }
    const current = { now: new Date("2026-10-26T10:00:00.000Z") }
    const { store, queued } = dashResetStoreCreate(storage, current)
    try {
      store.update("simulieren", (draft) => {
        draft.session.simulatedRole = "einlass"
      })
      expect(store.state.session.simulatedRole).toBe("einlass")
      expect(storage.values.get(dashResetKey)).toBeUndefined()
      expect(writes).toBe(0)

      current.now = new Date("2026-10-26T12:00:00.000Z")
      store.reset()
      const afterReset = storage.values.get(dashResetKey)
      expect(writes).toBe(1)
      expect(afterReset).toBeDefined()
      expect(JSON.parse(afterReset ?? "").seededAt).toBe("2026-10-26T12:00:00.000Z")
      expect(JSON.parse(afterReset ?? "").session.simulatedRole).toBeNull()

      // pagehide-Flush danach schreibt denselben (neuen) Zustand – nichts Altes.
      store.flush()
      expect(writes).toBe(1)
      expect(storage.values.get(dashResetKey)).toBe(afterReset)

      // Auch ein überfälliger Debounce-Timer der alten Änderung schreibt nichts mehr nach.
      await new Promise((resolve) => setTimeout(resolve, 450))
      expect(writes).toBe(1)
      expect(storage.values.get(dashResetKey)).toBe(afterReset)
      expect(queued).toHaveLength(0)
    } finally {
      store.dispose()
    }
  })

  test("Flush ohne Änderung schreibt nichts – entfernter Eintrag bleibt weg und Reload seedet neu", () => {
    const storage = dashFakeStorage()
    const current = { now: new Date("2026-10-26T10:00:00.000Z") }
    const first = dashResetStoreCreate(storage, current)
    try {
      // Frisch erstellter Store: Flush ohne Änderung schreibt nichts.
      first.store.flush()
      expect(storage.values.get(dashResetKey)).toBeUndefined()

      first.store.update("simulieren", (draft) => {
        draft.session.simulatedRole = "einlass"
      })
      first.store.flush()
      expect(storage.values.get(dashResetKey)).toBeDefined()

      // Manuelles Entfernen (localStorage.removeItem) wird vom Flush nicht rückgängig gemacht.
      storage.values.delete(dashResetKey)
      first.store.flush()
      expect(storage.values.get(dashResetKey)).toBeUndefined()
    } finally {
      first.store.dispose()
    }

    // Reload: ein neuer Store seedet zuverlässig neu.
    const second = dashResetStoreCreate(storage, current)
    try {
      expect(second.store.state.session.userId).toBe("user-mara")
      expect(second.store.state.session.simulatedRole).toBeNull()
    } finally {
      second.store.dispose()
    }
  })
})

describe("dashStore Selektoren", () => {
  test("Session, Orgs, Rollen und Rechte passen zusammen", () => {
    const state = dashFakeSeed(new Date("2026-10-26T10:00:00.000Z"))
    // ohne activeOrgId fällt die Auswahl auf die erste Org des Users zurück
    expect(dashActiveOrgIn(state)?.id).toBe("org-lindenhof")
    expect(dashActiveRoleIn(state)).toBe("inhaber")
    expect(dashCanIn(state, "bank.bearbeiten")).toBe(true)
    const outsider: DashState = { ...state, session: { ...state.session, userId: "user-neu" } }
    expect(dashActiveOrgIn(outsider)).toBeNull()
    expect(dashActiveRoleIn(outsider)).toBeNull()
    expect(dashCanIn(outsider, "finanzen.sehen")).toBe(false)
    const active: DashState = { ...state, session: { ...state.session, activeOrgId: "org-lindenhof" } }
    expect(dashActiveOrgIn(active)?.id).toBe("org-lindenhof")
    expect(dashActiveRoleIn(active)).toBe("inhaber")
    expect(dashCanIn(active, "bank.bearbeiten")).toBe(true)
    const simulated: DashState = { ...active, session: { ...active.session, simulatedRole: "einlass" } }
    expect(dashActiveRoleIn(simulated)).toBe("einlass")
    expect(dashCanIn(simulated, "umsatz.sehen")).toBe(false)
    expect(dashCanIn(simulated, "einlass.nutzen")).toBe(true)
    expect(dashOrgEventsIn(active, "org-lindenhof").map((event) => event.id)).toEqual(["ev-frueh", "ev-spaet"])
    expect(dashEventByIdIn(active, "ev-spaet")?.slug).toBe("spaet")
    expect(dashOrgBySlugIn(active, "kulturhaus-lindenhof")?.id).toBe("org-lindenhof")
    expect(dashEventBySlugsIn(active, "kulturhaus-lindenhof", "frueh")?.id).toBe("ev-frueh")
    expect(dashEventBySlugsIn(active, "unbekannt", "frueh")).toBeNull()
  })

  test("Org-Wechsel verlangt Mitgliedschaft", () => {
    const storage = dashFakeStorage()
    const { store } = dashStoreTestCreate(storage, new Date("2026-10-26T10:00:00.000Z"))
    store.update("setup-neu", (draft) => {
      draft.session.userId = "user-neu"
    })
    const denied = (() => {
      const state = store.state
      const member = state.members.find(
        (candidate) => candidate.orgId === "org-lindenhof" && candidate.userId === state.session.userId,
      )
      return member === undefined
    })()
    expect(denied).toBe(true)
    store.dispose()
  })

  test("dashIdCreate erzeugt IDs mit Präfix und dashAuditAdd schreibt Einträge", () => {
    const id = dashIdCreate("ev")
    expect(id).toMatch(/^ev-[a-z0-9]{8}$/)
    const state = dashFakeSeed(new Date("2026-10-26T10:00:00.000Z"))
    const before = state.audit.length
    dashAuditAdd(state, {
      orgId: "org-lindenhof",
      eventId: null,
      area: "team",
      action: "Rolle geändert",
    })
    expect(state.audit).toHaveLength(before + 1)
    expect(state.audit.at(-1)?.actor).toBe("Mara Lindner")
    expect(state.audit.at(-1)?.id.startsWith("audit-")).toBe(true)
  })
})
