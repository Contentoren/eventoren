import { beforeEach, expect, mock, test } from "bun:test"
import { createRoot } from "solid-js"
import type { AdminCatalogPageState } from "../src/admin/AdminCatalogPageState.ts"
import type { AdminEventItem } from "../src/admin/AdminEventItem.ts"
import { adminCatalogPageStateCreate } from "../src/admin/adminCatalogPageStateCreate.ts"
import { adminEventDetailsFormStateCreate } from "../src/admin/adminEventDetailsFormStateCreate.ts"
import { createResult } from "../src/ui/createResult.ts"

let catalog: AdminCatalogPageState
let search: { tab?: "products" }
let calls: string[]
let navigation: unknown
let navigateWait: Promise<void> | undefined

// Keep router/server-function mocks isolated from the rest of the test suite.
mock.module("@tanstack/solid-router", () => ({
  getRouteApi: () => ({
    useSearch: () => () => search,
    useNavigate: () => async (options: unknown) => {
      calls.push("navigate")
      navigation = options
      await navigateWait
    },
  }),
}))
mock.module("../src/admin/adminEventsRouteStateCreate.ts", () => ({
  adminEventsRouteStateCreate: () => catalog,
}))

const { adminEventNewRouteStateCreate } = await import("../src/admin/adminEventNewRouteStateCreate.ts")

const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
const flush = async () => {
  for (let index = 0; index < 12; index += 1) await Promise.resolve()
}
const submitEvent = { preventDefault() {} } as SubmitEvent
const returnedKey = "server-returned-key"

const setup = (
  options: {
    failure?: "event" | "tier" | "tier-refresh"
    eventWait?: Promise<void>
    tierWait?: Promise<void>
    tierRefreshWait?: Promise<void>
  } = {},
) => {
  let events: AdminEventItem[] = []
  let reloadCount = 0
  catalog = adminCatalogPageStateCreate({
    events: () => events,
    isServerAuthorized: () => true,
    reloadEvents: async () => {
      reloadCount += 1
      calls.push(`reload-${reloadCount}`)
      if (reloadCount === 2) {
        await options.tierRefreshWait
        if (options.failure === "tier-refresh") return { success: false, errorMessage: "Refresh failed" }
      }
      return createResult(events)
    },
    eventUpsert: async (input) => {
      calls.push("save-event")
      await options.eventWait
      if (options.failure === "event") return { success: false, errorMessage: "Event failed", op: "event" }
      events = [
        {
          ...input,
          id: returnedKey,
          catalogVersion: 1,
          status: "draft",
          soldOut: false,
          tiers: [],
        },
      ]
      return createResult({ eventKey: returnedKey, catalogVersion: 1 })
    },
    ticketTierUpsert: async (input) => {
      calls.push("save-tier")
      await options.tierWait
      if (options.failure === "tier") return { success: false, errorMessage: "Tier failed", op: "tier" }
      events = [
        {
          ...events[0]!,
          tiers: [
            {
              id: input.tierKey,
              name: input.name,
              description: input.description,
              priceCents: input.priceCents,
              feeCents: input.feeCents,
              capacity: input.capacity,
              available: input.capacity,
            },
          ],
        },
      ]
      return createResult({ tierKey: input.tierKey, catalogVersion: 2 })
    },
  })
  const state = adminEventNewRouteStateCreate()
  state.catalog.eventFieldChange("eventKey", "requested-key")
  state.catalog.eventFieldChange("title", "New event")
  state.catalog.tierFieldChange("tierKey", "standard")
  state.catalog.tierFieldChange("name", "Standard")
  state.catalog.tierFieldChange("startsAt", "2026-10-01T18:00:00.000Z")
  state.catalog.tierFieldChange("endsAt", "2026-10-01T22:00:00.000Z")
  state.catalog.tierFieldChange("priceCents", "2500")
  state.catalog.tierFieldChange("feeCents", "0")
  state.catalog.tierFieldChange("capacity", "20")
  const form = adminEventDetailsFormStateCreate({ catalog: state.catalog, onSaved: state.onSaved })
  return { state, form }
}

beforeEach(() => {
  search = {}
  calls = []
  navigation = undefined
  navigateWait = undefined
})

test.each([undefined, "products"] as const)(
  "details save reloads and replace-navigates with the returned key (tab=%s)",
  async (tab) => {
    await createRoot(async (dispose) => {
      try {
        search = tab ? { tab } : {}
        const navigating = deferred()
        navigateWait = navigating.promise
        const { form } = setup()
        let finished = false
        const saving = form.submit(submitEvent).then(() => {
          finished = true
        })
        await flush()
        expect(calls).toEqual(["save-event", "reload-1", "navigate"])
        expect(navigation).toEqual({
          to: "/admin/events/$eventKey",
          params: { eventKey: returnedKey },
          search: tab ? { tab } : {},
          replace: true,
        })
        expect(finished).toBe(false)
        expect(form.pendingAction()).toBe("save")
        navigating.resolve()
        await saving
        expect(form.pendingAction()).toBeNull()
      } finally {
        dispose()
      }
    })
  },
)

test("navigation preserves the tab selected while the event save is pending", async () => {
  await createRoot(async (dispose) => {
    try {
      const savingEvent = deferred()
      const { form } = setup({ eventWait: savingEvent.promise })
      const saving = form.submit(submitEvent)
      await flush()
      expect(calls).toEqual(["save-event"])
      search = { tab: "products" }
      savingEvent.resolve()
      await saving
      expect(navigation).toMatchObject({ search: { tab: "products" } })
    } finally {
      dispose()
    }
  })
})

test("failed event save does not navigate", async () => {
  await createRoot(async (dispose) => {
    try {
      const { form } = setup({ failure: "event" })
      await form.submit(submitEvent)
      expect(calls).toEqual(["save-event"])
      expect(navigation).toBeUndefined()
      expect(form.pendingAction()).toBeNull()
    } finally {
      dispose()
    }
  })
})

test("ticket-first creation waits for the full tier save and refresh, not the intermediate event autosave", async () => {
  await createRoot(async (dispose) => {
    try {
      search = { tab: "products" }
      const tier = deferred()
      const refresh = deferred()
      const navigating = deferred()
      navigateWait = navigating.promise
      const { state } = setup({ tierWait: tier.promise, tierRefreshWait: refresh.promise })
      let finished = false
      const saving = state.catalog.saveTier().then(() => {
        finished = true
      })
      await flush()
      expect(calls).toEqual(["save-event", "reload-1", "save-tier"])
      expect(navigation).toBeUndefined()
      tier.resolve()
      await flush()
      expect(calls).toEqual(["save-event", "reload-1", "save-tier", "reload-2"])
      expect(navigation).toBeUndefined()
      refresh.resolve()
      await flush()
      expect(calls).toEqual(["save-event", "reload-1", "save-tier", "reload-2", "navigate"])
      expect(navigation).toEqual({
        to: "/admin/events/$eventKey",
        params: { eventKey: returnedKey },
        search: { tab: "products" },
        replace: true,
      })
      expect(finished).toBe(false)
      navigating.resolve()
      await saving
      expect(state.catalog.selectedEvent()?.tiers[0]?.id).toBe("standard")
    } finally {
      dispose()
    }
  })
})

test.each(["event", "tier", "tier-refresh"] as const)("ticket-first %s failure does not navigate", async (failure) => {
  await createRoot(async (dispose) => {
    try {
      search = { tab: "products" }
      const { state } = setup({ failure })
      await state.catalog.saveTier()
      expect(state.catalog.errorMessage()).not.toBe("")
      expect(navigation).toBeUndefined()
      if (failure === "event") expect(calls).not.toContain("save-tier")
    } finally {
      dispose()
    }
  })
})
