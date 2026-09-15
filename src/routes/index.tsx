import { createFileRoute } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import { HomePage } from "../marketing/HomePage.js"
import { seo } from "../lib/seo.js"
import type { EventFilter } from "../events/EventFilter.ts"
import { eventDiscoverySearchParse } from "../events/eventDiscoverySearchParse.js"
import { catalogEventListPublishedPagePublicGet } from "../server/catalogEventListPublishedPagePublicGet.ts"

const siteName = "eventoren"
const description = "A public Solid website built with Adaptive DS."
const initialPageSize = 12
const getCatalogEvents = createServerFn({ method: "GET" })
  .validator((filter: EventFilter) => filter)
  .handler(({ data: filter }) =>
    catalogEventListPublishedPagePublicGet({
      filter,
      paginationOpts: { numItems: initialPageSize, cursor: null },
    }),
  )

export const Route = createFileRoute("/")({
  validateSearch: eventDiscoverySearchParse,
  loaderDeps: ({ search }) =>
    ({
      query: search.q ?? "",
      location: search.ort ?? "",
      category: search.kategorie ?? "alle",
      timeWindow: search.zeitraum ?? "alle",
    }) satisfies EventFilter,
  loader: async ({ deps: filter }) => ({ filter, result: await getCatalogEvents({ data: filter }) }),
  head: () => ({
    meta: seo.pageMeta({ title: siteName, description, path: "/" }),
    links: [seo.canonicalLink("/")],
  }),
  component: () => <HomePage initialPage={Route.useLoaderData()} />,
})
