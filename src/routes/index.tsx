import { createFileRoute } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import { HomePage } from "../marketing/HomePage.js"
import { seo } from "../lib/seo.js"
import type { EventFilter } from "../events/EventFilter.ts"
import { eventDiscoverySearchParse } from "../events/eventDiscoverySearchParse.js"
import { isServer } from "solid-js/web"
import { cataloguePublicPageFetch } from "../client/cataloguePublicPageFetch.ts"
import { catalogEventListPublishedPagePublicCachedGet } from "../server/catalogEventListPublishedPagePublicCachedGet.ts"

const siteName = "eventoren"
const description = "A public Solid website built with Adaptive DS."
const getCatalogEvents = createServerFn({ method: "GET" })
  .validator((filter: EventFilter) => filter)
  .handler(({ data: filter }) =>
    catalogEventListPublishedPagePublicCachedGet({
      filter,
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
  loader: async ({ deps: filter }) => ({
    filter,
    result: await (isServer ? getCatalogEvents({ data: filter }) : cataloguePublicPageFetch(filter)),
  }),
  head: () => ({
    meta: seo.pageMeta({ title: siteName, description, path: "/" }),
    links: [seo.canonicalLink("/")],
  }),
  component: () => <HomePage initialPage={Route.useLoaderData()} />,
})
