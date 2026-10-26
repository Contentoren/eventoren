import { expect, mock, test } from "bun:test"
import { createEffect, createRoot, createSignal } from "solid-js"
import * as solidWeb from "solid-js/web"
import type { CatalogEventListPublishedPage } from "../src/catalog/CatalogEventListPublishedPage.ts"
import type { ApiClientResult } from "../src/client/apiClient.ts"
import type { EventFilter } from "../src/events/EventFilter.ts"
import type { EventItem } from "../src/events/EventItem.ts"

// The router package evaluates DOM templates at import time, so the homepage state is exercised
// against the small search/navigate surface it consumes.
const [searchParamsGet, searchParamsSet] = createSignal<Record<string, string>>({
  q: "",
  ort: "",
  kategorie: "alle",
  zeitraum: "alle",
})
const navigateCalls: Array<Record<string, unknown>> = []

mock.module("@tanstack/solid-router", () => ({
  getRouteApi: (_routeId: string) => ({
    useSearch: () => searchParamsGet,
    useNavigate: () => (options: Record<string, unknown>) => {
      navigateCalls.push(options)
      return Promise.resolve()
    },
  }),
}))

const { indexPageStateCreate } = await import("../src/events/indexPageStateCreate.ts")
type IndexPageState = ReturnType<typeof indexPageStateCreate>

const abiball: EventItem = {
  id: "abiball-36a4910d",
  catalogVersion: 1,
  title: "Abiball KABItalismus",
  subtitle: "Berlin",
  description: "Abiball 2027",
  category: "abiball",
  startsAt: "2027-02-20T19:00:00.000Z",
  endsAt: "2027-02-20T23:00:00.000Z",
  doorsAt: "2027-02-20T18:00:00.000Z",
  venue: "Stadtbad",
  city: "Berlin",
  address: "Berlin",
  organizer: "KAB",
  imageUrl: "",
  imageAlt: "",
  tags: [],
  soldOut: false,
  tiers: [],
}

const pilates: EventItem = {
  id: "pilates-christmas-event-2027-final",
  catalogVersion: 1,
  title: "Pilates Christmas Event",
  subtitle: "Bonn",
  description: "Pilates",
  category: "sport",
  startsAt: "2027-12-01T18:00:00.000Z",
  endsAt: "2027-12-01T20:00:00.000Z",
  doorsAt: "2027-12-01T17:00:00.000Z",
  venue: "Studio",
  city: "Bonn",
  address: "Bonn",
  organizer: "Pilates",
  imageUrl: "",
  imageAlt: "",
  tags: [],
  soldOut: false,
  tiers: [],
}

const winterEvent: EventItem = {
  ...pilates,
  id: "winter-concert-2027",
  title: "Winter Concert",
}

const unfiltered: EventFilter = { query: "", location: "", category: "alle", timeWindow: "alle" }

const publishedPage: {
  filter: EventFilter
  result: ApiClientResult<CatalogEventListPublishedPage>
} = {
  filter: unfiltered,
  result: {
    success: true,
    data: { page: [abiball, pilates], isDone: false, continueCursor: "cursor-2" },
  },
}

// Mirrors the catalog view: the event list when events exist, the loading placeholder otherwise.
function catalogRender(state: IndexPageState) {
  if (state.error().length > 0 && state.events().length === 0) {
    return solidWeb.ssrElement("div", { role: "alert" }, "Der Eventkatalog ist gerade nicht verfügbar.", false)
  }
  if (state.events().length === 0 && !state.isDone()) {
    return solidWeb.ssrElement("div", { "aria-live": "polite" }, "Events werden geladen …", false)
  }
  return solidWeb.ssrElement(
    "ul",
    { class: "grid" },
    state
      .events()
      .map((event) =>
        solidWeb.ssrElement(
          "li",
          {},
          solidWeb.ssrElement("a", { href: `/events/${event.id}` }, event.title, false),
          false,
        ),
      ),
    false,
  )
}

function tick() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

if (solidWeb.isServer) {
  test("the server runtime never runs effects, so the loader page has to be seeded synchronously", () => {
    let effectRan = false
    createRoot(() => {
      createEffect(() => {
        effectRan = true
      })
    })

    expect(solidWeb.isServer).toBe(true)
    expect(effectRan).toBe(false)
  })

  test("the server render contains every event of the loader-provided published page", () => {
    let state: IndexPageState | undefined
    const html = solidWeb.renderToString(() => {
      const seeded = indexPageStateCreate({ initialPage: () => publishedPage })
      state = seeded
      return catalogRender(seeded)
    })

    expect(html).toContain(`href="/events/${abiball.id}"`)
    expect(html).toContain(abiball.title)
    expect(html).toContain(`href="/events/${pilates.id}"`)
    expect(html).toContain(pilates.title)
    expect(html).not.toContain("Events werden geladen")
    // One link per event: the server render neither misses nor duplicates a catalog entry.
    expect(html.match(/href="\/events\//g)).toHaveLength(2)

    // The events are present before any effect could run: the state is filled during creation.
    expect(state?.events().map((event) => event.id)).toEqual([abiball.id, pilates.id])
    expect(state?.resultCount()).toBe(2)
    expect(state?.isDone()).toBe(false)
    expect(state?.isLoading()).toBe(false)
    expect(state?.error()).toBe("")
  })

  test("the seeded page keeps its cursor so the next page continues behind the first one", async () => {
    const requestedCursors: Array<string | null> = []
    const pageGet = async (input: { paginationOpts: { numItems: number; cursor: string | null } }) => {
      requestedCursors.push(input.paginationOpts.cursor)
      return {
        success: true as const,
        data: { page: [winterEvent], isDone: true, continueCursor: "" },
      }
    }

    const state = indexPageStateCreate({ initialPage: () => publishedPage, pageGet })
    expect(state.events().length).toBe(2)

    state.loadMore()
    expect(state.isLoading()).toBe(true)

    await tick()

    expect(requestedCursors).toEqual(["cursor-2"])
    expect(state.events().map((event) => event.id)).toEqual([abiball.id, pilates.id, winterEvent.id])
    expect(state.resultCount()).toBe(3)
    expect(state.isDone()).toBe(true)
    expect(state.isLoading()).toBe(false)
    expect(state.error()).toBe("")
  })

  test("a failing loader page surfaces the error instead of an empty loading placeholder", () => {
    const state = indexPageStateCreate({
      initialPage: () => ({
        filter: unfiltered,
        result: { success: false, error: { status: 503, message: "Katalog nicht erreichbar" } },
      }),
    })

    expect(state.events()).toEqual([])
    expect(state.resultCount()).toBe(0)
    expect(state.error()).toBe("Katalog nicht erreichbar")
    expect(state.isLoading()).toBe(false)
    expect(state.isDone()).toBe(false)
  })

  test("a loader page for a different filter is not rendered on the server", () => {
    searchParamsSet({ q: "abiball", ort: "", kategorie: "alle", zeitraum: "alle" })

    try {
      const state = indexPageStateCreate({ initialPage: () => publishedPage })

      expect(state.events()).toEqual([])
      expect(state.error()).toBe("")
    } finally {
      searchParamsSet({ q: "", ort: "", kategorie: "alle", zeitraum: "alle" })
    }
  })

  test("a filter change clears the list and navigates with the new search parameters", () => {
    navigateCalls.length = 0
    const state = indexPageStateCreate({ initialPage: () => publishedPage })

    state.applyFilter({ query: "pilot", location: "Bonn", category: "sport", timeWindow: "alle" })

    expect(state.events()).toEqual([])
    expect(navigateCalls).toEqual([
      {
        to: "/",
        search: { q: "pilot", ort: "Bonn", kategorie: "sport", zeitraum: undefined, buchung: undefined },
        replace: true,
        resetScroll: false,
      },
    ])
  })

  test("the browser runtime keeps the live filter updates working", async () => {
    const subprocess = Bun.spawn(["bun", "--conditions=browser", "test", import.meta.path], {
      stdout: "pipe",
      stderr: "pipe",
    })
    const [exitCode, stdout, stderr] = await Promise.all([
      subprocess.exited,
      new Response(subprocess.stdout).text(),
      new Response(subprocess.stderr).text(),
    ])

    expect(exitCode, `${stdout}\n${stderr}`).toBe(0)
    expect(`${stdout}\n${stderr}`).toContain("1 pass")
  })
} else {
  test("a filter change clears the list and the next loader page fills it again", async () => {
    const [page, setPage] = createSignal(publishedPage)
    await createRoot(async (dispose) => {
      try {
        const state = indexPageStateCreate({ initialPage: page })

        // The seeded page is applied once, so the hydrated list holds one entry per event.
        expect(state.events().map((event) => event.id)).toEqual([abiball.id, pilates.id])

        searchParamsSet({ q: "pilot", ort: "", kategorie: "alle", zeitraum: "alle" })
        await tick()
        expect(state.events()).toEqual([])

        setPage({
          filter: { query: "pilot", location: "", category: "alle", timeWindow: "alle" },
          result: { success: true, data: { page: [pilates], isDone: true, continueCursor: "" } },
        })
        await tick()

        expect(state.events().map((event) => event.id)).toEqual([pilates.id])
        expect(state.resultCount()).toBe(1)
        expect(state.isDone()).toBe(true)
      } finally {
        dispose()
      }
    })
  })
}
