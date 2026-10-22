import { expect, mock, test } from "bun:test"
import { createRoot } from "solid-js"
import { isServer } from "solid-js/web"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { AdminCatalogPageState } from "../src/admin/AdminCatalogPageState.ts"
import type { AdminEventItem } from "../src/admin/AdminEventItem.ts"
import { adminCatalogPageStateCreate } from "../src/admin/adminCatalogPageStateCreate.ts"
import { adminEventDetailsFormStateCreate } from "../src/admin/adminEventDetailsFormStateCreate.ts"
import { createResult } from "../src/ui/createResult.ts"

// Router/server-function mocks stay in this isolated browser-conditions subprocess.
let catalog: AdminCatalogPageState
const eventKey = createSignalObject("first")
mock.module("@tanstack/solid-router", () => ({
  getRouteApi: () => ({
    useParams: () => () => ({ eventKey: eventKey.get() }),
    useSearch: () => () => ({}),
  }),
}))
mock.module("../src/admin/adminEventsRouteStateCreate.ts", () => ({
  adminEventsRouteStateCreate: () => catalog,
}))
const { adminEventDetailRouteStateCreate } = await import("../src/admin/adminEventDetailRouteStateCreate.ts")

const eventCreate = (id: string, title: string): AdminEventItem => ({
  id,
  title,
  status: "draft",
  catalogVersion: 1,
  subtitle: "",
  description: "",
  category: "konzerte",
  startsAt: "",
  endsAt: "",
  doorsAt: "",
  venue: "",
  city: "",
  address: "",
  organizer: "",
  imageUrl: "",
  imageAlt: "",
  tags: [],
  soldOut: false,
  tiers: [],
})
const flush = () => Promise.resolve()

test("saves the latest local title after a live snapshot refresh without replacing the initialized draft", async () => {
  expect(isServer).toBe(false)
  await createRoot(async (dispose) => {
    try {
      eventKey.set("first")
      const first = eventCreate("first", "Original title")
      const live = createSignalObject<readonly AdminEventItem[]>([])
      let savedTitle = ""
      catalog = adminCatalogPageStateCreate({
        events: () => [],
        eventsLive: live.get,
        isServerAuthorized: () => true,
        reloadEvents: async () => createResult(live.get()),
        eventUpsert: async (input) => {
          savedTitle = input.title
          return createResult({ eventKey: input.eventKey, catalogVersion: 3 })
        },
      })
      const detail = adminEventDetailRouteStateCreate()
      const form = adminEventDetailsFormStateCreate({ catalog })
      await flush()
      expect(detail.event()).toBeUndefined()
      live.set([first])
      await flush()
      expect(catalog.selectedEventKey()).toBe("first")
      expect(catalog.eventDraft().title).toBe("Original title")
      const revision = catalog.eventDraftRevision()

      catalog.eventFieldChange("title", "Latest local title")
      live.set([{ ...first, title: "Other client's title", catalogVersion: 2 }])
      await flush()
      expect(detail.event()?.title).toBe("Other client's title")
      expect(catalog.selectedEvent()?.title).toBe("Other client's title")
      expect(catalog.eventDraftRevision()).toBe(revision)
      expect(catalog.eventDraft().title).toBe("Latest local title")

      await form.submit({ preventDefault() {} } as SubmitEvent)
      expect(savedTitle).toBe("Latest local title")
      expect(catalog.eventDraft().title).toBe("Latest local title")
      expect(catalog.errorMessage()).toBe("")
    } finally {
      dispose()
    }
  })
})

test("a missing event resolves while paginating and confirms missing or error only once exhausted", async () => {
  await createRoot(async (dispose) => {
    try {
      eventKey.set("missing")
      const loading = createSignalObject(false)
      const done = createSignalObject(false)
      const failure = createSignalObject("")
      catalog = adminCatalogPageStateCreate({
        events: () => [],
        eventsLive: () => undefined,
        isLoading: loading.get,
        isDone: done.get,
        eventsError: failure.get,
        isServerAuthorized: () => true,
        reloadEvents: async () => createResult([]),
      })
      const detail = adminEventDetailRouteStateCreate()
      await flush()
      expect(detail.event()).toBeUndefined()
      expect(detail.loadError()).toBe("")
      // Page one has no match but more pages are pending: keep resolving, never confirm missing.
      expect(detail.isResolving()).toBe(true)
      expect(detail.notFound()).toBe(false)
      loading.set(true)
      await flush()
      expect(detail.isResolving()).toBe(true)
      expect(detail.notFound()).toBe(false)
      // Exhausted without a match: confirm missing.
      loading.set(false)
      done.set(true)
      await flush()
      expect(detail.isResolving()).toBe(false)
      expect(detail.notFound()).toBe(true)
      // A load error surfaces instead of the missing card.
      failure.set("Admin-Veranstaltungen werden geladen.")
      await flush()
      expect(detail.loadError()).toBe("Admin-Veranstaltungen werden geladen.")
      expect(detail.isResolving()).toBe(false)
      expect(detail.notFound()).toBe(false)
    } finally {
      dispose()
    }
  })
})

test("navigation initializes the destination draft from its event, not the outgoing new-form edit", async () => {
  await createRoot(async (dispose) => {
    try {
      const first = eventCreate("first", "Stored first title")
      const second = eventCreate("second", "Stored second title")
      const live = createSignalObject<readonly AdminEventItem[]>([first, second])
      const outgoing = adminCatalogPageStateCreate({
        events: () => [],
        isServerAuthorized: () => true,
        reloadEvents: async () => createResult([]),
      })
      outgoing.eventFieldChange("eventKey", "first")
      outgoing.eventFieldChange("title", "Outgoing form edit")
      catalog = adminCatalogPageStateCreate({
        events: live.get,
        eventsLive: live.get,
        isServerAuthorized: () => true,
        reloadEvents: async () => createResult(live.get()),
      })
      eventKey.set("first")
      const detail = adminEventDetailRouteStateCreate()
      await flush()
      expect(detail.eventKey()).toBe("first")
      expect(catalog.eventDraft().title).toBe("Stored first title")
      catalog.eventFieldChange("title", "Unsaved first edit")

      eventKey.set("second")
      await flush()
      expect(catalog.selectedEventKey()).toBe("second")
      expect(catalog.eventDraft().title).toBe("Stored second title")
      catalog.eventFieldChange("title", "Unsaved second edit")
      live.set([first, { ...second, catalogVersion: 2 }])
      await flush()
      expect(catalog.eventDraft().title).toBe("Unsaved second edit")
      expect(outgoing.eventDraft().title).toBe("Outgoing form edit")
    } finally {
      dispose()
    }
  })
})
